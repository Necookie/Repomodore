import { tokenCache } from '../src/utils/tokenCache';

describe('Auth & Token Cache', () => {
  it('stores and retrieves session tokens correctly', async () => {
    await tokenCache.saveToken('test_session_user_1', 'token_abc_123');
    const token = await tokenCache.getToken('test_session_user_1');
    expect(token).toBe('token_abc_123');
  });

  it('clears session token upon sign out', async () => {
    await tokenCache.saveToken('test_session_user_2', 'token_xyz_456');
    await tokenCache.clearToken?.('test_session_user_2');
    const token = await tokenCache.getToken('test_session_user_2');
    expect(token).toBeNull();
  });

  it('isolates different user session tokens', async () => {
    await tokenCache.saveToken('user_a_token', 'token_A');
    await tokenCache.saveToken('user_b_token', 'token_B');

    const tokenA = await tokenCache.getToken('user_a_token');
    const tokenB = await tokenCache.getToken('user_b_token');

    expect(tokenA).toBe('token_A');
    expect(tokenB).toBe('token_B');
    expect(tokenA).not.toBe(tokenB);
  });
});
