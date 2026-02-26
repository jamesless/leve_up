export interface IUser {
  id: string;
  username: string;
  wins: number;
  losses: number;
  created_at: string;
}

export interface ILoginRequest {
  username: string;
  password: string;
}

export interface IRegisterRequest {
  username: string;
  password: string;
}

export interface IAuthResponse {
  success: boolean;
  token?: string;
  user?: IUser;
  error?: string;
}

export interface IUserResponse {
  success: boolean;
  user?: IUser;
  error?: string;
}
