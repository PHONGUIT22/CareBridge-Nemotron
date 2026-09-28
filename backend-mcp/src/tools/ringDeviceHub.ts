export interface SmartDeviceHubResult {
  success: boolean;
  action: 'checkFrontPorch' | 'triggerEmergencyDoorUnlock' | 'getDeviceStatus';
  cameraName: string;
  timestamp: string;
  doorLockStatus: 'LOCKED' | 'UNLOCKED FOR PARAMEDICS';
  motionDetected?: boolean;
  packageDetected?: boolean;
  packageDetails?: {
    carrier: string;
    description: string;
    deliveryTime: string;
    orderId?: string;
  };
  emergencyReason?: string;
  speechText: string;
  richCard?: {
    type: 'SmartDoorbellFeed' | 'RingDoorbellFeed';
    cameraName: string;
    mode: 'delivery' | 'emergency' | 'live';
    doorLockStatus: string;
    packageDetected: boolean;
    packageDetails?: {
      carrier: string;
      description: string;
      deliveryTime: string;
      orderId?: string;
    };
    emergencyReason?: string;
    timestamp: string;
  };
}

// Backwards-compatible alias
export type RingDeviceHubResult = SmartDeviceHubResult;

export const ringDeviceHubTool = {
  definition: {
    name: 'ringDeviceHub',
    description:
      'Smart IoT Home Hub: Connects smart security doorbell and emergency smart access locks. Inspects front porch camera, verifies prescription parcel deliveries, and unlocks smart lock for emergency paramedics.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['checkFrontPorch', 'triggerEmergencyDoorUnlock', 'getDeviceStatus'],
          description:
            'Action to perform: checkFrontPorch (inspect porch/package), triggerEmergencyDoorUnlock (emergency paramedic access), getDeviceStatus (device health).',
        },
        reason: {
          type: 'string',
          description: 'Reason for triggering device action (e.g. "Medical Emergency Alert", "Medication Refill Delivery").',
        },
      },
      required: ['action'],
    },
  },

  async handler(args: {
    action?: 'checkFrontPorch' | 'triggerEmergencyDoorUnlock' | 'getDeviceStatus';
    reason?: string;
  }): Promise<SmartDeviceHubResult> {
    const timestamp = new Date().toISOString();
    const action = args?.action || 'checkFrontPorch';

    if (action === 'triggerEmergencyDoorUnlock') {
      const speechText = 'Smart Access Hub has unlocked the front door for incoming paramedics.';
      return {
        success: true,
        action: 'triggerEmergencyDoorUnlock',
        cameraName: 'Smart Security Doorbell - Front Porch',
        timestamp,
        doorLockStatus: 'UNLOCKED FOR PARAMEDICS',
        emergencyReason: args?.reason || 'Critical Medical Alert Dispatched',
        speechText,
        richCard: {
          type: 'SmartDoorbellFeed',
          cameraName: 'Smart Security Doorbell - Front Porch',
          mode: 'emergency',
          doorLockStatus: 'UNLOCKED FOR PARAMEDICS',
          packageDetected: false,
          emergencyReason: args?.reason || 'Critical Medical Alert Dispatched',
          timestamp,
        },
      };
    }

    // Default action: checkFrontPorch (Inspect front porch camera & detect prescription parcel)
    const speechText = 'Security Doorbell: CareBridge prescription package delivered at your front porch.';
    return {
      success: true,
      action: 'checkFrontPorch',
      cameraName: 'Smart Security Doorbell - Front Porch',
      timestamp,
      motionDetected: true,
      packageDetected: true,
      packageDetails: {
        carrier: 'CareBridge Express Medical Delivery',
        description: 'CareBridge Prescription Refill Parcel (30 Tablets)',
        deliveryTime: 'Just now',
        orderId: 'CB-7294821-4928103',
      },
      doorLockStatus: 'LOCKED',
      speechText,
      richCard: {
        type: 'SmartDoorbellFeed',
        cameraName: 'Smart Security Doorbell - Front Porch',
        mode: 'delivery',
        doorLockStatus: 'LOCKED',
        packageDetected: true,
        packageDetails: {
          carrier: 'CareBridge Express Medical Delivery',
          description: 'CareBridge Prescription Refill Parcel (30 Tablets)',
          deliveryTime: 'Just now',
          orderId: 'CB-7294821-4928103',
        },
        timestamp,
      },
    };
  },
};
