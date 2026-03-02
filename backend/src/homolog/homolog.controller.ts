import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { HomologService } from './homolog.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpsertClientDto } from './dto/upsert-client.dto';
import { SaveMeasurementDto } from './dto/save-measurement.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Controller('homolog')
export class HomologController {
  constructor(private readonly homologService: HomologService) {}

  @Post('users/register')
  register(@Body() dto: RegisterUserDto) {
    return this.homologService.registerUser(dto);
  }

  @Post('users/login')
  login(@Body() dto: LoginUserDto) {
    return this.homologService.login(dto);
  }

  @Post('users/change-password')
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.homologService.changePassword(dto);
  }

  @Post('users/profile/update')
  updateProfile(@Body() dto: UpdateUserProfileDto) {
    return this.homologService.updateUserProfile(dto);
  }

  @Post('clients/upsert')
  upsertClient(@Body() dto: UpsertClientDto) {
    return this.homologService.upsertClient(dto);
  }

  @Get('clients')
  listClients() {
    return this.homologService.listClients();
  }

  @Delete('clients/:id')
  deleteClient(@Param('id') id: string) {
    return this.homologService.deleteClient(id);
  }

  @Post('measurements/upsert')
  saveMeasurement(@Body() dto: SaveMeasurementDto) {
    return this.homologService.saveMeasurement(dto);
  }

  @Get('measurements')
  listMeasurements() {
    return this.homologService.listMeasurements();
  }

  @Post('stock/movement')
  saveStockMovement(@Body() dto: StockMovementDto) {
    return this.homologService.saveStockMovement(dto);
  }

  @Get('stock/balances')
  getStockBalances() {
    return this.homologService.getStockBalances();
  }
}
