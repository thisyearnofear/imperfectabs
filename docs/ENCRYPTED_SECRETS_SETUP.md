# 🔐 Chainlink Functions Encrypted Secrets Setup

This guide explains how to properly set up encrypted secrets for Chainlink Functions to enable OpenAI API integration.

## 🚨 **Current Status: Secrets Not Configured**

Your implementation currently has **placeholder secrets management**. To enable real AI analysis with OpenAI, you need to:

1. ✅ **Encrypt your OpenAI API key**
2. ✅ **Upload encrypted secrets to Chainlink DON**
3. ✅ **Configure your app to use the encrypted secrets**

## 🔧 **Quick Setup**

### **Step 1: Run the Setup Script**

```bash
npm run setup:secrets
```

This interactive script will:

- Prompt for your private key (not stored)
- Prompt for your OpenAI API key
- Encrypt the API key using Chainlink's encryption
- Upload encrypted secrets to the DON
- Generate configuration for your app

### **Step 2: Update Your Environment**

Add the generated values to your `.env` file:

```bash
CHAINLINK_SECRETS_SLOT_ID=0
CHAINLINK_SECRETS_VERSION=1
CHAINLINK_SECRETS_LOCATION=DONHosted
```

### **Step 3: Configure Your App**

Update your ChainlinkFunctionsManager:

```typescript
// In your component or initialization code
functionsManager.setEncryptedSecretsConfig({
  slotId: 0,
  version: 1,
  secretsLocation: "DONHosted",
});
```

## 🔍 **How It Works**

### **Before (Current State)**

```typescript
// No encrypted secrets - basic analysis only
const requestData = ethers.utils.defaultAbiCoder.encode(
  ["string[]", "bytes"],
  [args, "0x"] // Empty secrets
);
```

### **After (With Encrypted Secrets)**

```typescript
// With encrypted secrets - full OpenAI integration
const secretsBytes = ethers.utils.defaultAbiCoder.encode(
  ["uint8", "uint8", "uint8"],
  [1, slotId, version] // DONHosted secrets reference
);

const requestData = ethers.utils.defaultAbiCoder.encode(
  ["string[]", "bytes"],
  [args, secretsBytes] // Encrypted secrets reference
);
```

## 🔒 **Security Architecture**

### **Encryption Process**

1. **Client-Side**: Your API key is encrypted using DON's public key
2. **Upload**: Encrypted data is uploaded to Chainlink's secure storage
3. **Reference**: Only a slot ID and version are stored in your app
4. **Execution**: DON nodes decrypt secrets during function execution

### **Key Benefits**

- ✅ **API keys never exposed on-chain**
- ✅ **Decentralized secret management**
- ✅ **Automatic expiration (3 days maximum on testnet)**
- ✅ **No single point of failure**

## 📋 **Manual Setup (Advanced)**

If you prefer manual setup:

### **1. Initialize SecretsManager**

```javascript
const { SecretsManager } = require("@chainlink/functions-toolkit");

const secretsManager = new SecretsManager({
  signer: yourSigner,
  functionsRouterAddress: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
  donId: "fun-avalanche-fuji-1",
});
```

### **2. Encrypt Secrets**

```javascript
const secrets = {
  openaiApiKey: "sk-your-openai-api-key",
};

const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);
```

### **3. Upload to DON**

```javascript
const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
  encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
  gatewayUrls: [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ],
  slotId: 0,
  minutesUntilExpiration: 4320, // 72 hours (3 days) - testnet maximum
});
```

## 🧪 **Testing**

### **Verify Secrets Setup**

```bash
# Check if secrets are properly configured
npm run verify:chainlink
```

### **Test AI Analysis**

```bash
# Test with encrypted secrets
npm run test:functions
```

## ⚠️ **Important Notes**

### **Expiration**

- Secrets expire after **72 hours (3 days)** maximum on testnet
- Re-run setup script to refresh before expiration
- Use `npm run setup:secrets:prod` for custom expiration times (1h-72h)

The maximum allowed expiration time for DON-hosted secrets depends on the network type:

Mainnets: Up to 3 months (2160 hours)

Testnets: Up to 3 days (72 hours)

### **Slot Management**

- Each upload gets a unique slot ID
- Version increments with each update
- Old versions remain accessible until expiration

### **Cost Considerations**

- Uploading secrets costs gas
- Each request references the same encrypted secrets
- No additional cost per AI analysis request

## 🚨 **Troubleshooting**

### **"Secrets not found" Error**

```bash
# Re-upload secrets
npm run setup:secrets
```

### **"Invalid slot ID" Error**

```typescript
// Check your configuration
console.log(functionsManager.getEncryptedSecretsConfig());
```

### **"API key invalid" Error**

- Verify your OpenAI API key is valid
- Check key format (should start with 'sk-')
- Ensure sufficient OpenAI credits

## 🎯 **Next Steps**

After setting up encrypted secrets:

1. **Test the integration** with a real workout submission
2. **Monitor OpenAI usage** in your dashboard
3. **Set up monitoring** for secret expiration
4. **Consider production deployment** with longer expiration times

---

**🔗 Related Documentation:**

- [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Avalanche Fuji Testnet](https://docs.avax.network/quickstart/fuji-workflow)
