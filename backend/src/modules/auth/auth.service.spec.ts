import { ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import argon2 from 'argon2';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  it('rejects RA login from a second active device', async () => {
    const password_hash = await argon2.hash('secret-password');
    const userModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => '507f1f77bcf86cd799439011' },
          email: 'ra@example.com',
          password_hash,
          role: 'RA',
          full_name: 'Research Assistant',
          status: 'active',
        } as never),
      }),
    };
    const deviceExec = jest.fn().mockResolvedValue({
      device_id: 'registered-device',
      last_seen_at: new Date(),
      save: jest.fn(),
    } as never);
    const deviceModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: deviceExec,
        }),
      }),
    };

    const service = new AuthService(
      { signAsync: jest.fn(), verifyAsync: jest.fn() } as never,
      { getOrThrow: jest.fn() } as never,
      userModel as never,
      deviceModel as never,
      { updateMany: jest.fn(), create: jest.fn(), findOne: jest.fn() } as never,
    );

    await expect(
      service.login(
        { email: 'ra@example.com', password: 'secret-password' },
        'new-device',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
