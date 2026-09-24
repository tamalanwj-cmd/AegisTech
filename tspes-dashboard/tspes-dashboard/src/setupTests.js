// Jest (jsdom) does not provide TextEncoder/TextDecoder, which react-router 7
// requires at import time. Polyfill them from Node's util module.
import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
