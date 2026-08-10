import React from 'react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('recoil', () => ({
  useRecoilValue: () => null,
}));

jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    conversationByIndex: jest.fn(() => 'conversation-by-index'),
  },
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('@librechat/client', () => ({
  DropdownPopup: () => null,
  TooltipAnchor: ({ render }: { render: ReactNode }) => render,
  useMediaQuery: () => false,
}));

jest.mock('@ariakit/react', () => {
  const ActualReact = jest.requireActual<typeof import('react')>('react');
  return {
    MenuButton: ({ children }: { children: ReactNode }) =>
      ActualReact.createElement('button', null, children),
  };
});

jest.mock('~/components/Nav/ExportConversation/ExportModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/components/Conversations/ConvoOptions', () => ({
  ShareButton: () => null,
}));

import ExportAndShareMenu from '../ExportAndShareMenu';

describe('ExportAndShareMenu', () => {
  it('does not render when there is no active conversation', () => {
    const { container } = render(<ExportAndShareMenu isSharedButtonEnabled={true} />);

    expect(container).toBeEmptyDOMElement();
  });
});
