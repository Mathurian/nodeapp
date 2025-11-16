declare const encryptFile: (filePath: string, password: string) => Promise<Buffer>;
declare const decryptFile: (encryptedData: Buffer, password: string) => Promise<Buffer>;
declare const encryptAndStoreFile: (originalPath: string, encryptedPath: string, password: string) => Promise<{
    success: boolean;
    encryptedPath: string;
    originalSize: number;
    encryptedSize: number;
}>;
declare const decryptAndRetrieveFile: (encryptedPath: string, outputPath: string, password: string) => Promise<{
    success: boolean;
    outputPath: string;
    size: number;
}>;
declare const generateSecurePassword: () => any;
declare const hashPassword: (password: string, salt: Buffer) => string;
declare const verifyPassword: (password: string, hash: string, salt: Buffer) => boolean;
declare const encryptMetadata: (metadata: any, password: string) => string;
declare const decryptMetadata: (encryptedMetadata: string, password: string) => any;
declare const verifyFileIntegrity: (filePath: string, expectedChecksum: string) => Promise<boolean>;
declare const secureDeleteFile: (filePath: string) => Promise<{
    success: boolean;
}>;
export { encryptFile, decryptFile, encryptAndStoreFile, decryptAndRetrieveFile, generateSecurePassword, hashPassword, verifyPassword, encryptMetadata, decryptMetadata, verifyFileIntegrity, secureDeleteFile };
//# sourceMappingURL=fileEncryption.d.ts.map