import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Colors, Radius, Spacing } from '@/src/constants/theme';
import { Mascot } from '@/src/components/Mascot';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';

export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

export const AuthScreen: React.FC = () => {
  useWarmUpBrowser();

  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();

  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startGithubFlow } = useOAuth({ strategy: 'oauth_github' });

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOAuth = async (flow: (options?: any) => Promise<any>, providerName: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const redirectUrl = Linking.createURL('/oauth-native-callback', {
        scheme: 'repomodore',
      });
      const result = await flow({ redirectUrl });
      const { createdSessionId, setActive } = result || {};
      if (createdSessionId) {
        if (setActive) {
          await setActive({ session: createdSessionId });
        } else if (setSignInActive) {
          await setSignInActive({ session: createdSessionId });
        }
      }
    } catch (err: any) {
      console.warn(`OAuth with ${providerName} error:`, err);
      // Give actionable feedback
      setErrorMessage(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        `Could not complete sign in with ${providerName}. Please check your connection or try email.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!isSignInLoaded || !signIn) return;
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const completeSignIn = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setSignInActive({ session: completeSignIn.createdSessionId });
      } else {
        setErrorMessage('Sign in needs additional verification.');
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to sign in. Please check your credentials and connection.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (!email.trim() || !password) {
      setErrorMessage('Please enter an email and password to create an account.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      // Prepare email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to create account. Please check your information.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the verification code sent to your email.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
      } else {
        setErrorMessage('Verification is incomplete. Please check the code.');
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Verification code incorrect or expired.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoid}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardWrapper}>
          <Card variant="dark" style={styles.authCard}>
            {/* Mascot header */}
            <View style={styles.mascotWrapper}>
              <View style={styles.avatarCircle}>
                <Mascot pose="avatar" size={72} alt="Repomodore mascot face" />
              </View>
            </View>

            {/* Title & Tagline */}
            <Text style={styles.wordmark}>Repomodore</Text>
            <Text style={styles.tagline}>Focus. Rep. Repeat.</Text>
            <Text style={styles.subtitle}>
              {pendingVerification
                ? 'Check your email for the verification code'
                : 'Sign in to start your Repomodoros'}
            </Text>

            {errorMessage ? (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {pendingVerification ? (
              /* Verification Code Form */
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#7E848F"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Verification Code"
                />
                <Button
                  title="Verify & Continue"
                  onPress={handleVerifyCode}
                  loading={loading}
                  style={styles.actionBtn}
                />
                <Button
                  title="Back to Sign In"
                  onPress={() => {
                    setPendingVerification(false);
                    setErrorMessage(null);
                  }}
                  variant="ghost"
                  textStyle={styles.ghostText}
                />
              </View>
            ) : (
              /* Normal Auth Form */
              <View style={styles.formContainer}>
                {/* OAuth Buttons */}
                <Button
                  title="Continue with Google"
                  variant="secondary"
                  onPress={() => handleOAuth(startGoogleFlow, 'Google')}
                  disabled={loading}
                  style={styles.oauthBtn}
                  textStyle={styles.oauthBtnText}
                />
                <Button
                  title="Continue with GitHub"
                  variant="secondary"
                  onPress={() => handleOAuth(startGithubFlow, 'GitHub')}
                  disabled={loading}
                  style={styles.oauthBtn}
                  textStyle={styles.oauthBtnText}
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with email</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email & Password inputs */}
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#7E848F"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email Address"
                />

                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#7E848F"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  accessibilityLabel="Password"
                />

                <Button
                  title={authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  onPress={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp}
                  loading={loading}
                  style={styles.actionBtn}
                />

                <Pressable
                  onPress={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setErrorMessage(null);
                  }}
                  style={styles.switchModeBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.switchModeText}>
                    {authMode === 'signin'
                      ? "Don't have an account? Create one"
                      : 'Already have an account? Sign In'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Offline note */}
            <View style={styles.offlineNotice}>
              <Text style={styles.offlineNoticeText}>
                Local-only by default. An internet connection is required only for initial sign-in; your timer and history will work completely offline once signed in.
              </Text>
            </View>

            {/* Footer */}
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms and Privacy Policy.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  authCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  mascotWrapper: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#32353E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#424652',
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#A0A5AC',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: '#E0E3EB',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  oauthBtn: {
    marginBottom: Spacing.sm,
    backgroundColor: '#1E1F24',
    borderColor: '#383B44',
  },
  oauthBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A3D47',
  },
  dividerText: {
    color: '#8B919D',
    fontSize: 12,
    marginHorizontal: Spacing.sm,
  },
  inputLabel: {
    color: '#D0D4DC',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: Spacing.xs,
  },
  input: {
    height: 48,
    backgroundColor: '#1A1B20',
    borderWidth: 1,
    borderColor: '#3A3D47',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  switchModeBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  switchModeText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  ghostText: {
    color: '#A0A5AC',
  },
  offlineNotice: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
    backgroundColor: '#1E1F24',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#32353E',
  },
  offlineNoticeText: {
    color: '#8E95A2',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#707682',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
