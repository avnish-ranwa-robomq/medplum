package com.medplum.server.sql;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class SqlBuilder implements AutoCloseable {
    private final Statement formatter;
    private final StringBuilder sql;

    public SqlBuilder(final Connection conn) throws SQLException {
        this.formatter = conn.createStatement();
        this.sql = new StringBuilder();
    }

    public SqlBuilder append(final String str) {
        sql.append(str);
        return this;
    }

    public SqlBuilder append(final int i) {
        sql.append(i);
        return this;
    }

    public SqlBuilder appendIdentifier(final String str) throws SQLException {
        sql.append(formatter.enquoteIdentifier(str, true));
        return this;
    }

    public SqlBuilder appendColumn(final Column column) throws SQLException {
        if (column.getTableName() != null) {
            appendIdentifier(column.getTableName());
            sql.append(".");
        }
        appendIdentifier(column.getColumnName());
        return this;
    }

    @Override
    public String toString() {
        return sql.toString();
    }

    @Override
    public void close() throws SQLException {
        formatter.close();
    }
}
