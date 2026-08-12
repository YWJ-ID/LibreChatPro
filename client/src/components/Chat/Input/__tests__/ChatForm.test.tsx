import { shouldRenderChatInput } from '../ChatForm';

describe('ChatForm guest input visibility', () => {
  // 未认证用户没有 endpoint 时仍显示聊天输入框
  test('shows the input when a guest has no endpoint', () => {
    expect(shouldRenderChatInput(undefined, false)).toBe(true);
  });

  // 已认证用户没有 endpoint 时隐藏尚未初始化的聊天输入框
  test('hides the input when an authenticated conversation has no endpoint', () => {
    expect(shouldRenderChatInput(undefined, true)).toBe(false);
  });
});
