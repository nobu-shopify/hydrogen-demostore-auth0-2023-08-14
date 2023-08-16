import {AES, lib, SHA256, HmacSHA256, enc} from 'crypto-js';

/**
 * Custom implementation for Multipass
 * This implementsation uses crypto-js library
 * Designed to integrate into Hydrogen
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
    const hash = SHA256(this.secret);
//    console.log('hash', hash);

    // Use the first 128 bits of the hash as the encryption key
    const hashStr = hash.toString();
    this.encryptionKey = enc.Hex.parse(hashStr.slice(0, hashStr.length/2));
    this.signatureKey = enc.Hex.parse(hashStr.slice(hashStr.length/2, hashStr.length));
//    console.log('encryptionKey', this.encryptionKey);
//    console.log('signatureKey', this.signatureKey);
  }

  // Generate a Multipass token for the given customer data
  get(customerData) {

    // Store the current time in ISO8601 format.
    customerData.created_at = this.created_at;
    console.log('customerData', JSON.stringify(customerData));

    // Encrypt the JSON data using AES with 128-bit initialization vector.
    const iv = lib.WordArray.random(16);
    const cipherText = AES.encrypt(JSON.stringify(customerData), this.encryptionKey, {
      iv: iv,
    });
//    console.log('cipherText', cipherText);

    // Concart IV and encrypted cipherText.
    // Use IV as first block of ciphertext.
    const encrypted = iv.clone().concat(cipherText.ciphertext);
//    console.log('encrypted', encrypted);

    // Sign the IV + cipherText using HMAC
    const signed = HmacSHA256(encrypted, this.signatureKey);
//    console.log('signed', signed);

    // Concart IV, signed cipherText, and signature
    // The multipass login token now consists of 
    // - a 128 bit initialization vector
    // - a variable length ciphertext, and 
    // - a 256 bit signature (in this order)
    var token = encrypted.clone().concat(signed);
//    console.log('token(words)', token);

    // Encode everything using URL-safe Base64 (RFC 4648)
    token = token.toString(enc.Base64);
    token = token.replace(/\+/g, '-') // Replace + with -
                 .replace(/\//g, '_'); // Replace / with _
    console.log('token', token);

    return token;
  }
}
