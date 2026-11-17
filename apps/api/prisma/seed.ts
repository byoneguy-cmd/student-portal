/**
 * Seed-скрипт (ts-node) для «Единого студенческого портала».
 *
 * Создаёт минимальный набор данных для локальной разработки:
 *  - 2 пользователя (студент + админ) с public_id и ролями;
 *  - 3 вида льгот (ORPHAN, LARGE_FAMILY, DISABILITY);
 *  - 2 категории комнат;
 *  - 1 общежитие + 3 комнаты;
 *  - 1 учебный период + 2 курса + 2 реализации курса.
 *
 * Запуск: pnpm --filter @sp/api exec ts-node prisma/seed.ts
 * (требует сгенерированного клиента: pnpm prisma:generate)
 */
import {
  PrismaClient,
  DormitoryStatus,
  RoleType,
  RoomStatus,
  TermType,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    // ---------------------------------------------------------------------
    // 1. Пользователи (студент и админ) с ролями
    // ---------------------------------------------------------------------
    const student = await prisma.user.create({
      data: {
        public_id: '00000000-0000-4000-8000-000000000001',
        email: 'student@university.kz',
        email_normalized: 'student@university.kz',
        phone: '+77010000001',
        status: UserStatus.ACTIVE,
        is_pdn_consent_given: true,
        user_roles: {
          create: [{ role: RoleType.STUDENT }],
        },
      },
    });

    const admin = await prisma.user.create({
      data: {
        public_id: '00000000-0000-4000-8000-000000000002',
        email: 'admin@university.kz',
        email_normalized: 'admin@university.kz',
        phone: '+77010000002',
        status: UserStatus.ACTIVE,
        is_pdn_consent_given: true,
        user_roles: {
          create: [{ role: RoleType.ADMIN }],
        },
      },
    });

    console.log(
      `Созданы пользователи: студент id=${student.id} (${student.public_id}), ` +
        `админ id=${admin.id} (${admin.public_id})`,
    );

    // ---------------------------------------------------------------------
    // 2. Виды социальных льгот
    // ---------------------------------------------------------------------
    const orphan = await prisma.socialBenefitType.create({
      data: {
        code: 'ORPHAN',
        name_ru: 'Сирота',
        name_kz: 'Жетім',
        requires_document: true,
      },
    });
    const largeFamily = await prisma.socialBenefitType.create({
      data: {
        code: 'LARGE_FAMILY',
        name_ru: 'Многодетная семья',
        name_kz: 'Көпбалалы отбасы',
        requires_document: true,
      },
    });
    const disability = await prisma.socialBenefitType.create({
      data: {
        code: 'DISABILITY',
        name_ru: 'Инвалидность',
        name_kz: 'Мүгедектік',
        requires_document: true,
      },
    });

    console.log(
      `Созданы виды льгот: ${orphan.code}, ${largeFamily.code}, ${disability.code}`,
    );

    // ---------------------------------------------------------------------
    // 3. Категории комнат
    // ---------------------------------------------------------------------
    const standard = await prisma.roomType.create({
      data: {
        code: 'STANDARD',
        name_ru: 'Стандарт',
        name_kz: 'Стандарт',
        capacity: 2,
        monthly_fee: 15000,
      },
    });
    const improved = await prisma.roomType.create({
      data: {
        code: 'IMPROVED',
        name_ru: 'Улучшенная',
        name_kz: 'Жақсартылған',
        capacity: 2,
        monthly_fee: 25000,
      },
    });

    console.log(`Созданы категории комнат: ${standard.code}, ${improved.code}`);

    // ---------------------------------------------------------------------
    // 4. Общежитие + 3 комнаты
    // ---------------------------------------------------------------------
    const dormitory = await prisma.dormitory.create({
      data: {
        code: 'DORM-1',
        name_ru: 'Общежитие №1',
        name_kz: '№1 жатақхана',
        address: 'г. Алматы, ул. Примерная, 1',
        status: DormitoryStatus.ACTIVE,
        total_capacity: 300,
      },
    });

    for (let i = 1; i <= 3; i++) {
      await prisma.room.create({
        data: {
          dormitory_id: dormitory.id,
          room_type_id: standard.id,
          room_number: `10${i}`,
          floor: 1,
          status: RoomStatus.FREE,
          capacity: 2,
        },
      });
    }

    console.log(
      `Создано общежитие id=${dormitory.id} (${dormitory.code}) и 3 комнаты`,
    );

    // ---------------------------------------------------------------------
    // 5. Учебный период + 2 курса + 2 реализации курса
    // ---------------------------------------------------------------------
    const term = await prisma.academicTerm.create({
      data: {
        code: '2026-FALL',
        name_ru: 'Осенний семестр 2026',
        name_kz: '2026 күзгі семестр',
        term_type: TermType.SEMESTER,
        academic_year: '2026-2027',
        starts_on: new Date('2026-09-01'),
        ends_on: new Date('2026-12-25'),
        is_current: true,
      },
    });

    const course1 = await prisma.course.create({
      data: {
        code: 'CS101',
        name_ru: 'Программирование',
        name_kz: 'Бағдарламалау',
        credits_ects: 6,
      },
    });
    const course2 = await prisma.course.create({
      data: {
        code: 'MATH201',
        name_ru: 'Высшая математика',
        name_kz: 'Жоғары математика',
        credits_ects: 5,
      },
    });

    const instance1 = await prisma.courseInstance.create({
      data: { course_id: course1.id, term_id: term.id, section: 'A' },
    });
    const instance2 = await prisma.courseInstance.create({
      data: { course_id: course2.id, term_id: term.id, section: 'A' },
    });

    console.log(
      `Создан учебный период ${term.code}, курсы ${course1.code}/${course2.code}, ` +
        `реализации id=${instance1.id} и id=${instance2.id}`,
    );

    console.log('Seed успешно выполнен.');
  } catch (error) {
    console.error('Ошибка при выполнении seed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Seed завершился с ошибкой:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
