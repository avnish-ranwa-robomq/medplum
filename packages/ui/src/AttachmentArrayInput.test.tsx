import { Binary, MedplumClient } from '@medplum/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { randomUUID } from 'crypto';
import React from 'react';
import { AttachmentArrayInput, AttachmentArrayInputProps } from './AttachmentArrayInput';
import { MedplumProvider } from './MedplumProvider';

function mockFetch(url: string, options: any): Promise<any> {
  let result: any = {};

  if (options.method === 'POST' && url === 'https://example.com/fhir/R4/Binary') {
    const binary: Binary = {
      resourceType: 'Binary',
      id: randomUUID(),
      contentType: 'text/plain',
    };
    result = binary;
  }

  const response: any = {
    request: {
      url,
      options
    },
    ...result
  };

  return Promise.resolve({
    blob: () => Promise.resolve(response),
    json: () => Promise.resolve(response)
  });
}

const medplum = new MedplumClient({
  baseUrl: 'https://example.com/',
  clientId: 'my-client-id',
  fetch: mockFetch
});

const setup = (args?: AttachmentArrayInputProps) => {
  return render(
    <MedplumProvider medplum={medplum}>
      <AttachmentArrayInput name="test" {...args} />
    </MedplumProvider>
  );
};

describe('AttachmentArrayInput', () => {

  beforeAll(async () => {
    global.URL.createObjectURL = jest.fn(() => 'details');
  });

  test('Renders', () => {
    setup();
  });

  test('Renders empty array', () => {
    setup({
      name: 'test',
      defaultValue: []
    });
  });

  test('Renders attachments', async () => {
    await act(async () => {
      await setup({
        name: 'test',
        defaultValue: [{
          contentType: 'image/jpeg',
          url: 'https://example.com/test.jpg'
        }]
      });
      await waitFor(() => screen.getByTestId('attachment-input'));
    });
  });

  test('Add attachment', async () => {
    setup();

    await act(async () => {
      const files = [
        new File(['hello'], 'hello.txt', { type: 'text/plain' })
      ];
      fireEvent.change(screen.getByTestId('upload-file-input'), { target: { files } });
    });

    expect(screen.getByText('text/plain')).not.toBeUndefined();
  });

  test('Renders attachments', async () => {
    await act(async () => {
      await setup({
        name: 'test',
        defaultValue: [{
          contentType: 'image/jpeg',
          url: 'https://example.com/test.jpg'
        }]
      });
    });

    await act(async () => {
      await waitFor(() => screen.getByTestId('attachment-input'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Remove'));
    });

    expect(screen.queryByText('image/jpeg')).toBeNull();
  });

});
