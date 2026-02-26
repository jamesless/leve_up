import { get, post } from '@/lib/request';
import type { IAuthResponse, ILoginRequest, IRegisterRequest, IUserResponse } from '@/types';

export const login = (data: ILoginRequest) => post<IAuthResponse>('/login', data);

export const register = (data: IRegisterRequest) => post<IAuthResponse>('/register', data);

export const logout = () => post<{ success: boolean }>('/logout');

export const getCurrentUser = () => get<IUserResponse>('/user');
