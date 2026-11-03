import { Request, Response } from 'express';
import { UserRepo } from '../db/repositories/userRepo';
import { ApiResponse, User } from '../../shared/types';

export class AuthController {
  static login(req: Request, res: Response<ApiResponse<User>>): void {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Email is required' } });
      return;
    }

    let user = UserRepo.getByEmail(email);
    if (!user) {
      user = UserRepo.create({
        id: `u-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role: 'REVIEWER',
        court_station: 'Milimani Law Courts',
      });
    }

    res.json({ success: true, data: user });
  }

  static getCurrentUser(req: Request, res: Response<ApiResponse<User>>): void {
    const user = UserRepo.getById('u-1') || {
      id: 'u-1',
      name: 'Judicial Officer',
      email: 'officer@judiciary.go.ke',
      role: 'JUDICIAL_OFFICER',
      court_station: 'Milimani Law Courts',
    };
    res.json({ success: true, data: user });
  }

  static listUsers(req: Request, res: Response<ApiResponse<User[]>>): void {
    const users = UserRepo.listAll();
    res.json({ success: true, data: users });
  }
}
