import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Image } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Colors, Radius, Spacing } from '@/src/constants/theme';
import { Button } from '@/src/components/Button';
import { Mascot } from '@/src/components/Mascot';

interface AccountControlProps {
  onSignOutComplete?: () => void;
}

export const AccountControl: React.FC<AccountControlProps> = ({ onSignOutComplete }) => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? 'Anonymous User';
  const displayName = user?.fullName || primaryEmail.split('@')[0] || 'Repomodore User';

  const confirmSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      onSignOutComplete?.();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOutPress = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Sign out of Repomodore?\nYour local activity history will remain safely stored on this device.'
      );
      if (confirmed) {
        confirmSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Your local activity history will remain safely stored on this device and isolated from other accounts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: confirmSignOut },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileRow}>
        {user?.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Mascot pose="avatar" size={44} alt="User Avatar" />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.emailText} numberOfLines={1}>
            {primaryEmail}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Local data active</Text>
            </View>
          </View>
        </View>
      </View>

      <Button
        title="Sign Out"
        variant="ghost"
        onPress={handleSignOutPress}
        loading={signingOut}
        style={styles.signOutBtn}
        textStyle={styles.signOutText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#32353E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
  },
  emailText: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#EAE6E1',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '500',
  },
  signOutBtn: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  signOutText: {
    color: Colors.ink,
    fontSize: 14,
  },
});
