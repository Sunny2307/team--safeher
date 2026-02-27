import React, { useState, useEffect } from 'react';
import CustomModal from './CustomModal';
import customAlertService from '../services/customAlertService';

const AlertProvider = ({ children }) => {
  const [currentAlert, setCurrentAlert] = useState(null);

  useEffect(() => {
    const handleShowAlert = (alert) => {
      setCurrentAlert(alert);
    };

    const handleHideAlert = () => {
      setCurrentAlert(null);
    };

    customAlertService.on('show', handleShowAlert);
    customAlertService.on('hide', handleHideAlert);

    return () => {
      customAlertService.off('show', handleShowAlert);
      customAlertService.off('hide', handleHideAlert);
    };
  }, []);

  return (
    <>
      {children}
      {currentAlert && (
        <CustomModal
          visible={currentAlert.visible}
          onClose={() => customAlertService.closeAlert()}
          title={currentAlert.title}
          message={currentAlert.message}
          type={currentAlert.type}
          buttons={currentAlert.buttons}
        />
      )}
    </>
  );
};

export default AlertProvider;
