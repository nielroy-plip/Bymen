export interface Client {
  id: string;
  name: string;
  phone: string;
  documentEnc: string; // AES-256
  documentHash: string; // SHA256
  createdAt: Date;
}
