declare module 'tweetnacl' {
  export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
  export namespace sign {
    export function detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    export const detached: {
      verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
    };
    export function keyPair(): {
      publicKey: Uint8Array;
      secretKey: Uint8Array;
    };
    export function keyPair_fromSecretKey(secretKey: Uint8Array): {
      publicKey: Uint8Array;
      secretKey: Uint8Array;
    };
    export function keyPair_fromSeed(seed: Uint8Array): {
      publicKey: Uint8Array;
      secretKey: Uint8Array;
    };
    export const publicKeyLength: number;
    export const secretKeyLength: number;
    export const seedLength: number;
    export const signatureLength: number;
  };
}
