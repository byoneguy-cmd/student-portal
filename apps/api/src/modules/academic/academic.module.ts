import { Module } from '@nestjs/common';
import { ScheduleController } from './controllers/schedule.controller';
import { JournalController } from './controllers/journal.controller';
import { TranscriptController } from './controllers/transcript.controller';
import { AppealsController } from './controllers/appeals.controller';
import { ElectivesController } from './controllers/electives.controller';
import { AssignmentsController } from './controllers/assignments.controller';
import { QuizzesController } from './controllers/quizzes.controller';
import { ChatController } from './controllers/chat.controller';
import { StudentContextService } from './services/student-context.service';
import { GpaService } from './services/gpa.service';
import { ScheduleService } from './services/schedule.service';
import { JournalService } from './services/journal.service';
import { TranscriptService } from './services/transcript.service';
import { AppealsService } from './services/appeals.service';
import { ElectivesService } from './services/electives.service';
import { AssignmentsService } from './services/assignments.service';
import { QuizzesService } from './services/quizzes.service';
import { ChatService } from './services/chat.service';

/**
 * Модуль Academic (LMS): расписание, журнал/оценки, транскрипт, апелляции,
 * элективы, задания, тесты и чаты студента.
 */
@Module({
  controllers: [
    ScheduleController,
    JournalController,
    TranscriptController,
    AppealsController,
    ElectivesController,
    AssignmentsController,
    QuizzesController,
    ChatController,
  ],
  providers: [
    StudentContextService,
    GpaService,
    ScheduleService,
    JournalService,
    TranscriptService,
    AppealsService,
    ElectivesService,
    AssignmentsService,
    QuizzesService,
    ChatService,
  ],
})
export class AcademicModule {}
