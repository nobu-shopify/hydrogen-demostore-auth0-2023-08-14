import {json, redirect} from '@shopify/remix-oxygen';

// for Auth0
import {auth0UserProfile} from './($locale).account.login';

// for Multipass
import {AES, lib, SHA256, HmacSHA256, enc} from 'crypto-js';
// TODO: probably need to build my own multipass library...

export let loader = ({ request, context }) => {
  console.log('multipass loader');
  console.log('multipass secret', context.env.MULTIPASS_SECRET);
//  console.log('email', auth0UserProfile.profile.emails[0].value);

  // Initialize
  const multipass = new Multipass(context.env.MULTIPASS_SECRET);

  // Encode
  const customerData = {
//    email: auth0UserProfile.profile.emails[0].value,
    "email": "nobu.hayashi+auth0@shopify.com",
  };

  const token = multipass.encode(customerData);

  return redirect('/');
}

/**
 * Custom implementation for Multipass
 */
export class Multipass {
  secret;
  created_at;
  encryptionKey;
  signatureKey;

  constructor(secret) {
    this.secret = secret;
    this.created_at = new Date().toISOString();
    console.log('created_at', this.created_at);

    // Hash the secret with SHA256
//    const hash = SHA256(enc.Hex.parse(this.secret));
    const hash = SHA256(this.secret);
    console.log('hash', hash);

    // Use the first 128 bits of the hash as the encryption key
    const hashStr = hash.toString();
//    this.encryptionKey = (hashStr.slice(0, hashStr.length/2));
//    this.signatureKey = (hashStr.slice(hashStr.length/2, hashStr.length));
    this.encryptionKey = enc.Hex.parse(hashStr.slice(0, hashStr.length/2));
    this.signatureKey = enc.Hex.parse(hashStr.slice(hashStr.length/2, hashStr.length));
//    console.log('hashStr', hashStr);
    console.log('encryptionKey', this.encryptionKey);
    console.log('signatureKey', this.signatureKey);
  }

  // Encode the customer data
  encode(customerData) {

    // Store the current time in ISO8601 format.
    customerData.created_at = this.created_at;
    console.log('customerData', JSON.stringify(customerData));

    // Encrypt the JSON data using AES
    const iv = lib.WordArray.random(16);
//    const cipherText = AES.encrypt(enc.Hex.parse(JSON.stringify(customerData)), this.encryptionKey, {
    const cipherText = AES.encrypt(JSON.stringify(customerData), this.encryptionKey, {
      iv: iv,
  });

    // Sign the encrypted data using HMAC
    const signed = HmacSHA256(iv + cipherText, this.signatureKey);
//    const signed = HmacSHA256(cipherText, this.signatureKey);
//    const signed = HmacSHA256(cipherText.toString(), this.signatureKey);

    // Concart IV, signed cipherText, and signature
    // The multipass login token now consists of the 128 bit initialization vector, a variable length ciphertext, and a 256 bit signature (in this order)
    var token = iv.toString() + cipherText.toString() + signed.toString();
    console.log('token(string)', token);
    console.log('iv(string)', iv.toString());
    console.log('cipherText', cipherText);
    console.log('signed', signed);
    console.log('iv', iv);

    // Encode everything using URL-safe Base64 (RFC 4648)
    token = btoa(token);
    token = token.replace(/\+/g, '-') // Replace + with -
      .replace(/\//g, '_'); // Replace / with _
    console.log('token', token);

    return token;
//    return null;
  }
}
