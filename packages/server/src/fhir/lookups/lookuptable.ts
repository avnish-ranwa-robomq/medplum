import { Filter, Operator as FhirOperator, SortRule } from '@medplum/core';
import { Resource, ResourceType, SearchParameter } from '@medplum/fhirtypes';
import { Pool, PoolClient } from 'pg';
import { ResourceWrapper } from '../repo';
import { Column, Condition, Conjunction, DeleteQuery, Disjunction, InsertQuery, Operator, SelectQuery } from '../sql';

/**
 * The LookupTable interface is used for search parameters that are indexed in separate tables.
 * This is necessary for array properties with specific structure.
 * Common examples include:
 *   1) Identifiers - arbitrary key/value pairs on many different resource types
 *   2) Human Names - structured names on Patients, Practitioners, and other person resource types
 *   3) Contact Points - email addresses and phone numbers
 */
export abstract class LookupTable<T> {
  /**
   * Returns the unique name of the lookup table.
   * @param resourceType The resource type.
   * @returns The unique name of the lookup table.
   */
  protected abstract getTableName(resourceType: ResourceType): string;

  /**
   * Returns the column name for the given search parameter.
   * @param code The search parameter code.
   */
  protected abstract getColumnName(code: string): string;

  /**
   * Determines if the search parameter is indexed by this index table.
   * @param searchParam The search parameter.
   * @returns True if the search parameter is indexed.
   */
  abstract isIndexed(searchParam: SearchParameter, resourceType: string): boolean;

  /**
   * Indexes the resource in the lookup table.
   * @param client The database client.
   * @param wrapper The resource wrapper.
   */
  abstract indexResource(client: PoolClient, wrapper: ResourceWrapper): Promise<void>;

  /**
   * Adds "where" conditions to the select query builder.
   * @param selectQuery The select query builder.
   * @param resourceType The FHIR resource type.
   * @param predicate The conjunction where conditions should be added.
   * @param filter The search filter details.
   */
  addWhere(selectQuery: SelectQuery, resourceType: ResourceType, predicate: Conjunction, filter: Filter): void {
    const tableName = this.getTableName(resourceType);
    const joinName = selectQuery.getNextJoinAlias();
    const columnName = this.getColumnName(filter.code);
    const subQuery = new SelectQuery(tableName)
      .raw(`DISTINCT ON ("${tableName}"."resourceId") *`)
      .orderBy('resourceId');
    const disjunction = new Disjunction([]);
    for (const option of filter.value.split(',')) {
      if (filter.operator === FhirOperator.EXACT) {
        disjunction.expressions.push(new Condition(new Column(tableName, columnName), Operator.EQUALS, option?.trim()));
      } else {
        const conjunction = new Conjunction([]);
        for (const chunk of option.split(/\s+/)) {
          conjunction.expressions.push(
            new Condition(new Column(tableName, columnName), Operator.LIKE, `%${chunk.trim()}%`)
          );
        }
        disjunction.expressions.push(conjunction);
      }
    }
    subQuery.whereExpr(disjunction);
    selectQuery.join(joinName, 'id', 'resourceId', subQuery);
    predicate.expressions.push(new Condition(new Column(joinName, columnName), Operator.NOT_EQUALS, null));
  }

  /**
   * Adds "order by" clause to the select query builder.
   * @param selectQuery The select query builder.
   * @param resourceType The FHIR resource type.
   * @param sortRule The sort rule details.
   */
  addOrderBy(selectQuery: SelectQuery, resourceType: ResourceType, sortRule: SortRule): void {
    const tableName = this.getTableName(resourceType);
    const joinName = selectQuery.getNextJoinAlias();
    const columnName = this.getColumnName(sortRule.code);
    const subQuery = new SelectQuery(tableName)
      .raw(`DISTINCT ON ("${tableName}"."resourceId") *`)
      .orderBy('resourceId');
    selectQuery.join(joinName, 'id', 'resourceId', subQuery);
    selectQuery.orderBy(new Column(joinName, columnName), sortRule.descending);
  }

  /**
   * Returns the existing list of indexed addresses.
   * @param client The database client.
   * @param wrapper The resource wrapper.
   * @returns Promise for the list of indexed addresses.
   */
  protected async getExistingValues(client: Pool | PoolClient, wrapper: ResourceWrapper): Promise<T[]> {
    const tableName = this.getTableName((wrapper.resource as Resource).resourceType);
    return new SelectQuery(tableName)
      .column('content')
      .where('resourceId', Operator.EQUALS, wrapper.id)
      .orderBy('index')
      .execute(client)
      .then((result) => result.map((row) => JSON.parse(row.content) as T));
  }

  /**
   * Inserts values into the lookup table for a resource.
   * @param client The database client.
   * @param wrapper The resource wrapper.
   * @param values The values to insert.
   */
  protected async insertValuesForResource(
    client: Pool | PoolClient,
    wrapper: ResourceWrapper,
    values: Record<string, any>[]
  ): Promise<void> {
    if (values.length === 0) {
      return;
    }
    const tableName = this.getTableName((wrapper.resource as Resource).resourceType);
    await new InsertQuery(tableName, values).execute(client);
  }

  /**
   * Deletes the resource from the lookup table.
   * @param client The database client.
   * @param wrapper The resource wrapper.
   */
  async deleteValuesForResource(client: Pool | PoolClient, wrapper: ResourceWrapper): Promise<void> {
    const tableName = this.getTableName((wrapper.resource as Resource).resourceType);
    const resourceId = wrapper.id;
    await new DeleteQuery(tableName).where('resourceId', Operator.EQUALS, resourceId).execute(client);
  }
}
