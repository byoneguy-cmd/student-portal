import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { SignatureService } from './signature.service';
import { DocumentController } from './document.controller';
import { PackageController } from './package.controller';

/**
 * Document & Signature: реестр документов, пакеты, ЭЦП и hash-chain.
 * Экспортирует DocumentsService и SignatureService для Accommodation/SocialBenefits.
 */
@Module({
  // PackageController регистрируется раньше, чтобы литерал /documents/packages
  // не перехватывался параметром :id у DocumentController.
  controllers: [PackageController, DocumentController],
  providers: [DocumentsService, SignatureService],
  exports: [DocumentsService, SignatureService],
})
export class DocumentsModule {}
