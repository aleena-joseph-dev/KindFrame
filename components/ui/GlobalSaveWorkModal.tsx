import { useGuestData } from '@/contexts/GuestDataContext';
import React from 'react';
import { SaveWorkModal } from './SaveWorkModal';

export const GlobalSaveWorkModal: React.FC = () => {
  const {
    showSaveWorkModal,
    currentActionType,
    currentActionData,
    closeSaveWorkModal,
    handleSaveWorkSkip,
    handleSaveWorkSignIn,
    handleSaveWorkSignUp,
  } = useGuestData();

  if (!showSaveWorkModal || !currentActionData) {
    return null;
  }

  return (
    <SaveWorkModal
      visible={showSaveWorkModal}
      onClose={closeSaveWorkModal}
      onGoogleSignIn={handleSaveWorkSignUp}
      onEmailSignIn={handleSaveWorkSignIn}
      onSkip={handleSaveWorkSkip}
      onSignInLink={handleSaveWorkSignIn}
    />
  );
};
