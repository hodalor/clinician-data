import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { LoginDto } from './dto/login.dto.js';
import type { LogoutDto } from './dto/logout.dto.js';
import type { RefreshDto } from './dto/refresh.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() loginDto: LoginDto,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-device-request-poll') deviceRequestPoll?: string,
  ) {
    return this.authService.login(
      loginDto,
      deviceId,
      deviceRequestPoll === 'true',
    );
  }

  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto);
  }
}
