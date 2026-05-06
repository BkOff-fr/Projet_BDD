import { useEffect, useMemo, useState } from 'react';
import { User as UserIcon, Lock, AlertTriangle } from 'lucide-react';
import { LoadingState, ErrorState } from '@/components';
import { useAuth } from '@/hooks';
import { usersAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import type { UpdateProfileInput, UserProfile } from '@/types';

type TabId = 'profile' | 'security' | 'danger';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture: string;
}

interface ProfileFieldErrors {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

interface SecurityFormState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface SecurityFieldErrors {
  newPassword?: string;
  confirmNewPassword?: string;
}

const isValidUrl = (url: string) => /^https?:\/\/.+/.test(url);

/**
 * Build the diff between current form values and the snapshot loaded from the
 * API. Only fields that actually changed are included so we never send no-op
 * writes (the backend rejects empty payloads with a 400, see
 * `userController.ts#updateProfile`).
 */
const buildProfileDiff = (
  form: ProfileFormState,
  baseline: ProfileFormState
): UpdateProfileInput => {
  const diff: UpdateProfileInput = {};
  if (form.firstName !== baseline.firstName) diff.firstName = form.firstName.trim();
  if (form.lastName !== baseline.lastName) diff.lastName = form.lastName.trim();
  if (form.phone !== baseline.phone) diff.phone = form.phone.trim();
  if (form.profilePicture !== baseline.profilePicture) {
    diff.profilePicture = form.profilePicture.trim();
  }
  return diff;
};

const profileFromApi = (p: UserProfile): ProfileFormState => ({
  firstName: p.firstName ?? '',
  lastName: p.lastName ?? '',
  phone: p.phone ?? '',
  profilePicture: p.profilePicture ?? '',
});

export const SettingsPage = () => {
  const { updateUser, user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Profile tab state
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    profilePicture: '',
  });
  const [profileBaseline, setProfileBaseline] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    profilePicture: '',
  });
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileSubmitError, setProfileSubmitError] = useState<string | null>(null);

  // Security tab state
  const [securityForm, setSecurityForm] = useState<SecurityFormState>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [securityErrors, setSecurityErrors] = useState<SecurityFieldErrors>({});
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securitySubmitError, setSecuritySubmitError] = useState<string | null>(null);

  // Fetch profile (standard cancelled flag pattern used elsewhere).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    usersAPI
      .getProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        const initial = profileFromApi(p);
        setProfileForm(initial);
        setProfileBaseline(initial);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoadError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Auto-dismiss profile success after 3s (security success is sticky on
  // purpose — see task spec).
  useEffect(() => {
    if (!profileSuccess) return;
    const handle = window.setTimeout(() => setProfileSuccess(null), 3000);
    return () => window.clearTimeout(handle);
  }, [profileSuccess]);

  const isProfileDirty = useMemo(() => {
    return (
      profileForm.firstName !== profileBaseline.firstName ||
      profileForm.lastName !== profileBaseline.lastName ||
      profileForm.phone !== profileBaseline.phone ||
      profileForm.profilePicture !== profileBaseline.profilePicture
    );
  }, [profileForm, profileBaseline]);

  const validateProfile = (form: ProfileFormState): ProfileFieldErrors => {
    const errors: ProfileFieldErrors = {};
    // Only validate "non-empty if changed" — these fields exist on the User
    // record and the backend will reject empty strings.
    if (form.firstName !== profileBaseline.firstName && form.firstName.trim() === '') {
      errors.firstName = 'First name cannot be empty';
    }
    if (form.lastName !== profileBaseline.lastName && form.lastName.trim() === '') {
      errors.lastName = 'Last name cannot be empty';
    }
    if (form.profilePicture.trim() !== '' && !isValidUrl(form.profilePicture.trim())) {
      errors.profilePicture = 'Must be a valid URL starting with http:// or https://';
    }
    return errors;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitError(null);
    setProfileSuccess(null);

    const errors = validateProfile(profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const diff = buildProfileDiff(profileForm, profileBaseline);
    if (Object.keys(diff).length === 0) return;

    setProfileSaving(true);
    try {
      await usersAPI.updateProfile(diff);
      // Sync the in-memory User in AuthContext so the header avatar/name
      // updates immediately. We forward only the keys we actually set.
      const userPatch: Parameters<typeof updateUser>[0] = {};
      if (diff.firstName !== undefined) userPatch.firstName = diff.firstName;
      if (diff.lastName !== undefined) userPatch.lastName = diff.lastName;
      if (diff.phone !== undefined) userPatch.phone = diff.phone;
      if (diff.profilePicture !== undefined) {
        userPatch.profilePicture = diff.profilePicture;
      }
      updateUser(userPatch);

      // Re-baseline so the form goes pristine again with the new values.
      setProfileBaseline(profileForm);
      setProfileSuccess('Profile updated');
    } catch (err) {
      setProfileSubmitError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileDiscard = () => {
    setProfileForm(profileBaseline);
    setProfileErrors({});
    setProfileSubmitError(null);
  };

  const isSecurityFilled =
    securityForm.currentPassword.length > 0 &&
    securityForm.newPassword.length > 0 &&
    securityForm.confirmNewPassword.length > 0;

  const validateSecurity = (form: SecurityFormState): SecurityFieldErrors => {
    const errors: SecurityFieldErrors = {};
    if (form.newPassword.length > 0 && form.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters';
    }
    if (
      form.confirmNewPassword.length > 0 &&
      form.newPassword !== form.confirmNewPassword
    ) {
      errors.confirmNewPassword = 'Passwords do not match';
    }
    return errors;
  };

  const securityErrorsLive = validateSecurity(securityForm);
  const canSubmitSecurity =
    isSecurityFilled && Object.keys(securityErrorsLive).length === 0;

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySubmitError(null);
    setSecuritySuccess(null);

    const errors = validateSecurity(securityForm);
    setSecurityErrors(errors);
    if (Object.keys(errors).length > 0 || !isSecurityFilled) return;

    setSecuritySaving(true);
    try {
      await usersAPI.changePassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      });
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setSecurityErrors({});
      setSecuritySuccess('Password changed');
    } catch (err) {
      setSecuritySubmitError(err instanceof Error ? err.message : 'Change failed');
    } finally {
      setSecuritySaving(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string; icon: typeof UserIcon }> = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
  ];

  if (loading) {
    return <LoadingState label="Loading settings..." />;
  }

  if (loadError || !profile) {
    return (
      <ErrorState
        message={loadError ?? 'Could not load your settings.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const previewUrl =
    profileForm.profilePicture.trim() !== '' &&
    isValidUrl(profileForm.profilePicture.trim())
      ? profileForm.profilePicture.trim()
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your profile, security, and account preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar tabs */}
          <nav
            aria-label="Settings sections"
            className="bg-white rounded-xl shadow-card p-2 lg:sticky lg:top-28 lg:self-start"
          >
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-lg',
                      // Desktop: fully rounded pill on the active tab.
                      // Mobile: bottom-border underline (HostDashboard pattern).
                      isActive
                        ? 'text-primary lg:bg-primary/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary lg:hidden" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Tab content */}
          <div className="bg-white rounded-xl shadow-card p-6 sm:p-8">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} noValidate>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Profile
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Update your personal information. These details appear on your
                  public profile.
                </p>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                      >
                        First name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            firstName: e.target.value,
                          }))
                        }
                        className={cn(
                          'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
                          profileErrors.firstName
                            ? 'border-red-300'
                            : 'border-gray-300'
                        )}
                      />
                      {profileErrors.firstName && (
                        <p className="text-xs text-red-600 mt-1">
                          {profileErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                      >
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            lastName: e.target.value,
                          }))
                        }
                        className={cn(
                          'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
                          profileErrors.lastName
                            ? 'border-red-300'
                            : 'border-gray-300'
                        )}
                      />
                      {profileErrors.lastName && (
                        <p className="text-xs text-red-600 mt-1">
                          {profileErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Phone <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profilePicture"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Profile picture URL
                    </label>
                    <div className="flex items-start gap-3">
                      <input
                        id="profilePicture"
                        type="url"
                        value={profileForm.profilePicture}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            profilePicture: e.target.value,
                          }))
                        }
                        className={cn(
                          'flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
                          profileErrors.profilePicture
                            ? 'border-red-300'
                            : 'border-gray-300'
                        )}
                        placeholder="https://example.com/avatar.jpg"
                      />
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If the URL is well-formed but the image fails
                              // to load, hide the broken icon.
                              (e.currentTarget as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <UserIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>
                    {profileErrors.profilePicture && (
                      <p className="text-xs text-red-600 mt-1">
                        {profileErrors.profilePicture}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inline status blocks */}
                {profileSubmitError && (
                  <div className="mt-5 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                    {profileSubmitError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="mt-5 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                    {profileSuccess}
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                  {isProfileDirty && (
                    <button
                      type="button"
                      onClick={handleProfileDiscard}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    >
                      Discard changes
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!isProfileDirty || profileSaving}
                    className={cn(
                      'w-full sm:w-auto px-5 py-2 rounded-lg font-semibold transition-colors',
                      isProfileDirty && !profileSaving
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {profileSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleSecuritySubmit} noValidate>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Security
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Change your password. You will stay signed in on this device.
                </p>

                <div className="space-y-5 max-w-md">
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Current password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={securityForm.currentPassword}
                      onChange={(e) =>
                        setSecurityForm((f) => ({
                          ...f,
                          currentPassword: e.target.value,
                        }))
                      }
                      autoComplete="current-password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      New password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) =>
                        setSecurityForm((f) => ({
                          ...f,
                          newPassword: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
                        securityErrors.newPassword
                          ? 'border-red-300'
                          : 'border-gray-300'
                      )}
                    />
                    {securityErrors.newPassword && (
                      <p className="text-xs text-red-600 mt-1">
                        {securityErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmNewPassword"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Confirm new password
                    </label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      value={securityForm.confirmNewPassword}
                      onChange={(e) =>
                        setSecurityForm((f) => ({
                          ...f,
                          confirmNewPassword: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
                        securityErrors.confirmNewPassword
                          ? 'border-red-300'
                          : 'border-gray-300'
                      )}
                    />
                    {securityErrors.confirmNewPassword && (
                      <p className="text-xs text-red-600 mt-1">
                        {securityErrors.confirmNewPassword}
                      </p>
                    )}
                  </div>
                </div>

                {securitySubmitError && (
                  <div className="mt-5 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                    {securitySubmitError}
                  </div>
                )}
                {securitySuccess && (
                  <div className="mt-5 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center justify-between gap-3">
                    <span>{securitySuccess}</span>
                    <button
                      type="button"
                      onClick={() => setSecuritySuccess(null)}
                      className="text-green-700 hover:text-green-900 text-xs font-medium underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={!canSubmitSecurity || securitySaving}
                    className={cn(
                      'w-full sm:w-auto px-5 py-2 rounded-lg font-semibold transition-colors',
                      canSubmitSecurity && !securitySaving
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {securitySaving ? 'Changing...' : 'Change password'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'danger' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Danger zone
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Account-level actions. Take care — these are not part of the
                  routine settings.
                </p>

                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-0.5">
                      These actions are irreversible
                    </p>
                    <p>
                      Read carefully before clicking — once an action is
                      confirmed, it cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Delete account stub — wired to real modal in P2-T2 */}
                  <div className="border border-red-200 rounded-lg p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Delete account
                        </h3>
                        <p className="text-sm text-gray-600">
                          Permanently delete your account, listings, and
                          bookings. This cannot be undone and the data is not
                          recoverable.
                        </p>
                        <p className="text-xs text-gray-500 mt-2 italic">
                          Account deletion will be enabled in P2-T2.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // TODO(P2-T2): open DeleteAccountModal
                          console.log('TODO(P2-T2): open DeleteAccountModal');
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex-shrink-0"
                      >
                        Delete my account
                      </button>
                    </div>
                  </div>

                  {/* Become a host stub — wired to real flow in P2-T2.
                      Hidden when the user is already a host. */}
                  {user && user.isHost === false && (
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            Become a host
                          </h3>
                          <p className="text-sm text-gray-600">
                            Start hosting on StayScape. You will gain access to
                            the host dashboard and the ability to publish
                            listings.
                          </p>
                          <p className="text-xs text-gray-500 mt-2 italic">
                            Host onboarding will be enabled in P2-T2.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            // TODO(P2-T2): open BecomeHostFlow
                            console.log('TODO(P2-T2): open BecomeHostFlow');
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex-shrink-0"
                        >
                          Become a host
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
