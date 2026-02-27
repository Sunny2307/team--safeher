import React, { useState } from 'react';
import CustomModal from '../components/CustomModal';

class CustomAlertService {
  constructor() {
    this.alertQueue = [];
    this.currentAlert = null;
    this.listeners = new Map();
  }

  // Show a custom alert
  showAlert(options) {
    const alertId = Date.now().toString();
    const alert = {
      id: alertId,
      visible: true,
      ...options,
    };

    this.alertQueue.push(alert);
    this.processQueue();
    return alertId;
  }

  // Process the alert queue
  processQueue() {
    if (this.currentAlert || this.alertQueue.length === 0) {
      return;
    }

    this.currentAlert = this.alertQueue.shift();
    this.notifyListeners('show', this.currentAlert);
  }

  // Close current alert
  closeAlert() {
    if (this.currentAlert) {
      this.currentAlert.visible = false;
      this.notifyListeners('hide', this.currentAlert);
      this.currentAlert = null;
      
      // Process next alert in queue
      setTimeout(() => {
        this.processQueue();
      }, 300);
    }
  }

  // Show success alert
  showSuccess(title, message, buttons = []) {
    return this.showAlert({
      title,
      message,
      type: 'success',
      buttons: buttons.length > 0 ? buttons : [
        {
          text: 'OK',
          onPress: () => this.closeAlert(),
          primary: true,
        }
      ],
    });
  }

  // Show error alert
  showError(title, message, buttons = []) {
    return this.showAlert({
      title,
      message,
      type: 'error',
      buttons: buttons.length > 0 ? buttons : [
        {
          text: 'OK',
          onPress: () => this.closeAlert(),
          primary: true,
        }
      ],
    });
  }

  // Show warning alert
  showWarning(title, message, buttons = []) {
    return this.showAlert({
      title,
      message,
      type: 'warning',
      buttons: buttons.length > 0 ? buttons : [
        {
          text: 'OK',
          onPress: () => this.closeAlert(),
          primary: true,
        }
      ],
    });
  }

  // Show info alert
  showInfo(title, message, buttons = []) {
    return this.showAlert({
      title,
      message,
      type: 'info',
      buttons: buttons.length > 0 ? buttons : [
        {
          text: 'OK',
          onPress: () => this.closeAlert(),
          primary: true,
        }
      ],
    });
  }

  // Show confirmation dialog
  showConfirm(title, message, onConfirm, onCancel) {
    return this.showAlert({
      title,
      message,
      type: 'info',
      buttons: [
        {
          text: 'Cancel',
          onPress: () => {
            if (onCancel) onCancel();
            this.closeAlert();
          },
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () => {
            if (onConfirm) onConfirm();
            this.closeAlert();
          },
          primary: true,
        }
      ],
    });
  }

  // Show live location request
  showLiveLocationRequest(sessionId, onAccept, onDecline, friendName = null) {
    const message = friendName 
      ? `${friendName} wants to share their live location with you. Would you like to view it?`
      : 'A friend wants to share their live location with you. Would you like to view it?';
    
    return this.showAlert({
      title: 'Live Location Request',
      message,
      type: 'info',
      buttons: [
        {
          text: 'Decline',
          onPress: () => {
            if (onDecline) onDecline();
            this.closeAlert();
          },
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () => {
            if (onAccept) onAccept();
            this.closeAlert();
          },
          primary: true,
        }
      ],
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in alert listener:', error);
        }
      });
    }
  }
}

// Export singleton instance
export default new CustomAlertService();
