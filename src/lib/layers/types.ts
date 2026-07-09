export interface LayersUserInfo {
  sub?: string;
  name?: string;
  email?: string;
  ra?: string;
  registration_number?: string;
  external_id?: string;
  cpf?: string;
  [key: string]: unknown;
}

export interface LayersTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}
