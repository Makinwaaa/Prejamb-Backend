# Subscription Module Documentation

## Overview

The subscription module manages user subscriptions, payments, and access control for the Prejamb platform. It supports a free plan with trial access and three paid plans with varying features and durations.

## Subscription Plans

### FREE Plan
- **Price**: ₦0
- **Duration**: Lifetime (until trials are exhausted)
- **Exam Modes**: Pure JAMB, JAMB+AI (2 modes)
- **Trial Limit**: 1 trial per mode (2 total trials)
- **Auto-assigned**: Yes, when user completes profile
- **Behavior**: After both trials are used, all 3 exam modes become locked

### STARTER Plan
- **Price**: ₦500
- **Duration**: 30 days
- **Exam Modes**: Pure JAMB, JAMB+AI (2 modes)
- **Trial Limit**: Unlimited during subscription period
- **Payment Required**: Yes

### STANDARD Plan
- **Price**: ₦1,000
- **Duration**: 30 days
- **Exam Modes**: Pure JAMB, JAMB+AI, Single Subject (all 3 modes)
- **Trial Limit**: Unlimited during subscription period
- **Payment Required**: Yes

### ANNUAL Plan
- **Price**: ₦10,000
- **Duration**: 365 days
- **Exam Modes**: Pure JAMB, JAMB+AI, Single Subject (all 3 modes)
- **Trial Limit**: Unlimited during subscription period
- **Payment Required**: Yes

## API Endpoints

### 1. Get Available Plans
**GET** `/api/v1/subscription/plans`
- **Auth**: Not required
- **Description**: Retrieve all available subscription plans
- **Response**:
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": {
    "plans": [
      {
        "planType": "FREE",
        "name": "Free Plan",
        "amount": 0,
        "validity": "Lifetime",
        "examModes": ["PURE_JAMB", "JAMB_AI"],
        "features": {
          "pureJamb": true,
          "jambAI": true,
          "singleSubject": false
        }
      },
      // ... other plans
    ]
  }
}
```

### 2. Get Current Subscription
**GET** `/api/v1/subscription/current`
- **Auth**: Required (Bearer token)
- **Description**: Get user's current active subscription details
- **Response**:
```json
{
  "success": true,
  "message": "Subscription status retrieved successfully",
  "data": {
    "status": "ACTIVE",
    "currentPlan": {
      "planType": "FREE",
      "name": "Free Plan",
      "amount": 0,
      "startDate": "2026-01-30T12:00:00.000Z",
      "endDate": "2029-01-30T12:00:00.000Z",
      "daysRemaining": null,
      "freeTrialsUsed": ["PURE_JAMB"],
      "freeTrialsRemaining": 1,
      "examModes": ["PURE_JAMB", "JAMB_AI"]
    }
  }
}
```

### 3. Initialize Payment
**POST** `/api/v1/subscription/initialize-payment`
- **Auth**: Required (Bearer token)
- **Description**: Initialize a payment transaction for subscription upgrade
- **Request Body**:
```json
{
  "planType": "STARTER",
  "paymentMethod": "CARD"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "paymentReference": "PAY-1738254545-ABCD1234",
    "amount": 500,
    "plan": {
      "planType": "STARTER",
      "name": "Starter Plan",
      "amount": 500,
      "validity": "30 days",
      "durationDays": 30,
      "examModes": ["PURE_JAMB", "JAMB_AI"]
    }
  }
}
```

### 4. Verify Payment
**POST** `/api/v1/subscription/verify-payment`
- **Auth**: Not required (public endpoint)
- **Description**: Verify payment and activate subscription
- **Request Body**:
```json
{
  "paymentReference": "PAY-1738254545-ABCD1234",
  "paymentGatewayReference": "PSTK_xyz123" // Optional
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Payment verified and subscription activated successfully",
  "data": {
    "subscription": {
      "planType": "STARTER",
      "startDate": "2026-01-30T12:00:00.000Z",
      "endDate": "2026-03-01T12:00:00.000Z",
      "isActive": true
    }
  }
}
```

### 5. Check Exam Mode Access
**POST** `/api/v1/subscription/check-access`
- **Auth**: Required (Bearer token)
- **Description**: Check if user can access a specific exam mode
- **Request Body**:
```json
{
  "examMode": "PURE_JAMB"
}
```
- **Success Response (Access Granted)**:
```json
{
  "success": true,
  "message": "Access granted",
  "data": {
    "canAccess": true
  }
}
```
- **Error Response (Access Denied)**:
```json
{
  "success": false,
  "message": "Free trial for this mode has been used. Please upgrade to continue practicing.",
  "status": 403
}
```

### 6. Mark Trial as Used
**POST** `/api/v1/subscription/use-trial`
- **Auth**: Required (Bearer token)
- **Description**: Mark a free trial as used (called when exam starts on free plan)
- **Request Body**:
```json
{
  "examMode": "PURE_JAMB"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Trial marked as used"
}
```

### 7. Cancel Subscription
**POST** `/api/v1/subscription/cancel`
- **Auth**: Required (Bearer token)
- **Description**: Cancel the current active subscription
- **Response**:
```json
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
```

## Frontend Integration Flow

### 1. Displaying Subscription Page

```javascript
// Fetch current subscription
const response = await fetch('/api/v1/subscription/current', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const { data } = await response.json();

// Check if user is on free plan
if (data.currentPlan?.planType === 'FREE') {
  // Show message: "You are on the Free Plan: Upgrade to Starters or Standard to unlock more exam modes and AI features!"
}

// Fetch available plans
const plansResponse = await fetch('/api/v1/subscription/plans');
const { data: { plans } } = await plansResponse.json();
```

### 2. Upgrading Subscription

```javascript
// Step 1: User selects a plan and clicks "Activate"
// Show modal with plan details

const selectedPlan = {
  planType: 'STARTER',
  name: 'Starter Plan',
  amount: 500,
  validity: '30 days'
};

// Modal buttons:
// - "Change Plan" -> Go back to plan selection
// - "Make Payment" -> Proceed to payment

// Step 2: Initialize payment
const initResponse = await fetch('/api/v1/subscription/initialize-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    planType: 'STARTER',
    paymentMethod: 'CARD' // or 'TRANSFER' or 'USSD'
  })
});

const { data: paymentData } = await initResponse.json();
// paymentData contains: paymentReference, amount, plan

// Step 3: Show payment gateway modal
// Use paymentReference for the transaction
// After payment is completed, verify it

// Step 4: Verify payment
const verifyResponse = await fetch('/api/v1/subscription/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentReference: paymentData.paymentReference,
    paymentGatewayReference: 'GATEWAY_REF' // From payment gateway
  })
});

// Step 5: Update UI to show active subscription
```

### 3. Checking Exam Access

```javascript
// Before starting an exam
const checkAccess = await fetch('/api/v1/subscription/check-access', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  },
  body: JSON.stringify({ examMode: 'PURE_JAMB' })
});

if (checkAccess.ok) {
  // User can access this mode
  // If on free plan, mark trial as used when exam starts
  if (currentPlan.planType === 'FREE') {
    await fetch('/api/v1/subscription/use-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ examMode: 'PURE_JAMB' })
    });
  }
  // Start exam
} else {
  // Show error message and prompt to upgrade
  const error = await checkAccess.json();
  alert(error.message); // "Free trial for this mode has been used..."
}
```

### 4. Displaying Subscription Status in Personal Information

```javascript
// In the settings/personal information section
const { data: { status, currentPlan } } = await fetch('/api/v1/subscription/current', {
  headers: { Authorization: `Bearer ${accessToken}` }
}).then(r => r.json());

// Display:
// Subscription Status: ACTIVE or INACTIVE
// If ACTIVE:
//   - Plan Type: currentPlan.name
//   - Valid Until: currentPlan.endDate
//   - Days Remaining: currentPlan.daysRemaining (for paid plans)
```

## Payment Gateway Integration (Test Mode)

For testing, the system is configured to accept payments without actual gateway integration. In production:

1. **Initialize Payment**: Creates a payment record with `PENDING` status
2. **Payment Gateway**: Integration with Paystack, Flutterwave, or similar (Nigerian payment gateways)
3. **Verify Payment**: Updates payment status to `SUCCESS` and activates subscription

### Test Payment Flow:
```javascript
// For testing, you can directly verify any payment reference
const verifyResponse = await fetch('/api/v1/subscription/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentReference: 'PAY-1738254545-ABCD1234'
  })
});
// This will automatically mark as SUCCESS in test mode
```

## Database Models

### Subscription Model
```typescript
{
  userId: ObjectId,
  planType: 'FREE' | 'STARTER' | 'STANDARD' | 'ANNUAL',
  amount: Number,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  autoRenew: Boolean,
  freeTrialsUsed: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
  paymentReference: String
}
```

### Payment Model
```typescript
{
  userId: ObjectId,
  subscriptionId: ObjectId,
  amount: Number,
  planType: String,
  paymentMethod: 'CARD' | 'TRANSFER' | 'USSD',
  paymentReference: String,
  paymentGatewayReference: String,
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED',
  paidAt: Date,
  metadata: Object
}
```

## Important Notes

1. **Free Plan Auto-Assignment**: When a user completes their profile (first login), a free subscription is automatically created.

2. **Trial Exhaustion**: When a user on FREE plan exhausts both trials, they cannot access any exam mode until they upgrade.

3. **Subscription Upgrade**: When upgrading, the old subscription is deactivated and a new one is created with the new plan.

4. **Personal Information**: The `subscriptionStatus` field in user profile returns:
   - `ACTIVE` if user has an active subscription
   - `INACTIVE` if no active subscription or expired

5. **Payment Methods**: All three methods (CARD, TRANSFER, USSD) are supported in the payment flow.

6. **Exam Mode Access Logic**:
   - FREE: 2 one-time trials total
   - STARTER: Unlimited access to 2 modes for 30 days
   - STANDARD: Unlimited access to 3 modes for 30 days
   - ANNUAL: Unlimited access to 3 modes for 365 days

## Error Handling

Common error responses:
- `400`: Invalid request data
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (access denied to exam mode)
- `404`: Resource not found

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```
