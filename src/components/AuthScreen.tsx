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
  useWindowDimensions,
} from 'react-native';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Colors, Radius, Spacing } from '@/src/constants/theme';
import { APK_DOWNLOAD_URL } from '@/src/constants/links';
import { Mascot } from '@/src/components/Mascot';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { AndroidIcon } from '@/src/components/AndroidIcon';
import {
  Download,
  Timer,
  Dumbbell,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';

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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

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

  const handleDownloadApk = () => {
    Linking.openURL(APK_DOWNLOAD_URL);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoid}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Navbar */}
        <View style={styles.navBar}>
          <View style={styles.brandGroup}>
            <Mascot pose="avatar" size={36} alt="Repomodore Logo" />
            <Text style={styles.navWordmark}>Repomodore</Text>
          </View>
          <Pressable
            onPress={handleDownloadApk}
            style={styles.navDownloadBadge}
            accessibilityRole="button"
            accessibilityLabel="Download Android APK"
          >
            <AndroidIcon size={18} color="#3DDC84" />
            <Text style={styles.navDownloadText}>Get Android App</Text>
          </Pressable>
        </View>

        {/* Main Hero Container */}
        <View style={[styles.mainHeroContainer, isDesktop ? styles.desktopRow : styles.mobileCol]}>
          
          {/* Left Column: Brand Hero & Value Proposition & Mobile Download */}
          <View style={[styles.heroLeftCol, isDesktop && styles.heroLeftColDesktop]}>
            
            {/* Tagline Badge */}
            <View style={styles.taglineBadge}>
              <Sparkles size={14} color={Colors.accent} />
              <Text style={styles.taglineBadgeText}>Warm Study Desk Meets Playful Gym Habit</Text>
            </View>

            {/* Mascot Showcase Illustration */}
            <View style={styles.heroMascotWrap}>
              <Mascot
                pose="welcome"
                size={isDesktop ? 160 : 130}
                motion="calm"
                alt="Repomodore white gym rat mascot in gray hoodie with laptop and dumbbell"
              />
            </View>

            {/* Headline and Narrative Copy */}
            <Text style={styles.heroHeadline}>Focus. Rep. Repeat.</Text>
            <Text style={styles.heroSubtext}>
              Protect your deep study flow with 25-minute Pomodoro intervals, then stand up for guided squat breaks. Built with generous whitespace and friendly encouragement.
            </Text>

            {/* Key Value Feature Pills */}
            <View style={styles.featurePillsRow}>
              <View style={styles.featurePill}>
                <Timer size={16} color={Colors.accent} />
                <Text style={styles.featurePillText}>25/5 Pomodoro rhythm</Text>
              </View>
              <View style={styles.featurePill}>
                <Dumbbell size={16} color={Colors.accent} />
                <Text style={styles.featurePillText}>10 Squat habit cues</Text>
              </View>
              <View style={styles.featurePill}>
                <ShieldCheck size={16} color={Colors.accent} />
                <Text style={styles.featurePillText}>Local-first & private</Text>
              </View>
            </View>

            {/* Prominent Android Mobile Download Card */}
            <Card style={styles.mobileDownloadCard}>
              <View style={styles.mobileDownloadHeader}>
                <View style={styles.androidIconWrapper}>
                  <AndroidIcon size={26} color="#3DDC84" />
                </View>
                <View style={styles.mobileDownloadHeaderText}>
                  <Text style={styles.mobileDownloadTitle}>Repomodore for Android</Text>
                  <Text style={styles.mobileDownloadSubtitle}>
                    Native background alarms, haptics, and instant offline timers.
                  </Text>
                </View>
              </View>

              <Button
                title="Download Android APK"
                variant="primary"
                icon={<AndroidIcon size={20} color="#FFFFFF" />}
                onPress={handleDownloadApk}
                style={styles.downloadActionBtn}
                accessibilityLabel="Download Repomodore Android APK package"
              />

              <View style={styles.downloadMetaRow}>
                <Text style={styles.downloadMetaText}>v1.0.0 · Standalone APK · No Play Store account required</Text>
              </View>
            </Card>
          </View>

          {/* Right Column: Clerk Login / Registration Card */}
          <View style={[styles.authRightCol, isDesktop && styles.authRightColDesktop]}>
            <Card style={styles.authCard}>
              
              {/* Tab Mode Switcher (Sign In vs Create Account) */}
              <View style={styles.tabSwitcher}>
                <Pressable
                  onPress={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                  }}
                  style={[styles.tabButton, authMode === 'signin' && styles.tabButtonActive]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.tabButtonText, authMode === 'signin' && styles.tabButtonTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                  }}
                  style={[styles.tabButton, authMode === 'signup' && styles.tabButtonActive]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.tabButtonText, authMode === 'signup' && styles.tabButtonTextActive]}>
                    Create Account
                  </Text>
                </Pressable>
              </View>

              {/* Card Title & Instructions */}
              <Text style={styles.authCardTitle}>
                {pendingVerification
                  ? 'Verify your email'
                  : authMode === 'signin'
                  ? 'Welcome back!'
                  : 'Start your Repomodoros'}
              </Text>
              <Text style={styles.authCardSubtitle}>
                {pendingVerification
                  ? 'Enter the 6-digit confirmation code sent to your email.'
                  : authMode === 'signin'
                  ? 'Sign in with Clerk to sync sessions across all your devices.'
                  : 'Create a free account to track your focus streaks anywhere.'}
              </Text>

              {/* Actionable Error Alert */}
              {errorMessage ? (
                <View style={styles.errorContainer} accessibilityRole="alert">
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {pendingVerification ? (
                /* Verification Code View */
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={Colors.muted}
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
                /* Main Sign In / Sign Up Form */
                <View style={styles.formContainer}>
                  
                  {/* OAuth Social Buttons */}
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

                  {/* Divider Line */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with email</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Email Input */}
                  <Text style={styles.inputLabel}>Email address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Email Address"
                  />

                  {/* Password Input */}
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    accessibilityLabel="Password"
                  />

                  {/* Primary Action Button */}
                  <Button
                    title={authMode === 'signin' ? 'Sign In' : 'Create Free Account'}
                    onPress={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp}
                    loading={loading}
                    style={styles.actionBtn}
                  />
                </View>
              )}

              {/* Local-First Security Note */}
              <View style={styles.offlineNotice}>
                <ShieldCheck size={16} color={Colors.accent} />
                <Text style={styles.offlineNoticeText}>
                  Local-only by default. Sign-in is optional on mobile. All session timers and records work 100% offline.
                </Text>
              </View>

              {/* Terms Footer */}
              <Text style={styles.footerText}>
                Secured by Clerk. By continuing you agree to the Terms of Service.
              </Text>
            </Card>
          </View>
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  navBar: {
    width: '100%',
    maxWidth: 1140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  navWordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.4,
  },
  navDownloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 8,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  navDownloadText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  mainHeroContainer: {
    width: '100%',
    maxWidth: 1140,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xl,
  },
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mobileCol: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroLeftCol: {
    width: '100%',
  },
  heroLeftColDesktop: {
    flex: 1,
    maxWidth: 580,
    paddingRight: Spacing.lg,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginBottom: Spacing.md,
    gap: 6,
  },
  taglineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  heroMascotWrap: {
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
    lineHeight: 44,
  },
  heroSubtext: {
    fontSize: 16,
    color: Colors.muted,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  featurePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    gap: 8,
  },
  featurePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.ink,
  },
  mobileDownloadCard: {
    width: '100%',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  mobileDownloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  androidIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDownloadHeaderText: {
    flex: 1,
  },
  mobileDownloadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 2,
  },
  mobileDownloadSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  downloadActionBtn: {
    minHeight: 46,
    marginBottom: Spacing.sm,
  },
  downloadMetaRow: {
    alignItems: 'center',
  },
  downloadMetaText: {
    fontSize: 11,
    color: Colors.muted,
  },
  authRightCol: {
    width: '100%',
  },
  authRightColDesktop: {
    flex: 1,
    maxWidth: 460,
  },
  authCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F5F0EA',
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: Colors.ink,
  },
  authCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  authCardSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  oauthBtn: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  oauthBtnText: {
    color: Colors.ink,
    fontWeight: '600',
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.muted,
    fontSize: 12,
    marginHorizontal: Spacing.sm,
  },
  inputLabel: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: Spacing.xs,
  },
  input: {
    height: 48,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    color: Colors.ink,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  ghostText: {
    color: Colors.muted,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm + 2,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    gap: 8,
  },
  offlineNoticeText: {
    flex: 1,
    color: Colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  footerText: {
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
