import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { HouseholdSettingsModule } from '../../../../auth/household/household-settings/household-settings.module';
import { AccountModule } from '../../../../auth/user/account/account.module';
import { CoachModule } from '../../../platform/coach/coach.module';
import { TimeTemplateModule } from '../../energy/time-template/time-template.module';
import { MonthScoreModule } from '../../money/month-score/month-score.module';
import { WeekCheckModule as MoneyWeekCheckModule } from '../../money/week-check/week-check.module';
import { GrowthWeekCheckModule } from '../week-check/week-check.module';
import { CourseCalendarController } from './course-calendar.controller';
import { CourseCoachService } from './course-coach.service';
import { CourseFeedController } from './course-feed.controller';
import { CourseFeedService } from './course-feed.service';
import { CourseScheduleController } from './course-schedule.controller';
import { CourseScheduleService } from './course-schedule.service';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { GrowthCourseFeed } from './growth-course-feed.entity';
import { GrowthCourseItem } from './growth-course-item.entity';
import { GrowthCourseRhythmTick } from './growth-course-rhythm-tick.entity';
import { GrowthCourseRhythm } from './growth-course-rhythm.entity';
import { GrowthCourseRitualSnooze } from './growth-course-ritual-snooze.entity';
import { RhythmController } from './rhythm.controller';
import { RhythmService } from './rhythm.service';

/**
 * Course (Koers): the Growth cascade (year → day), Rhythm (routines), Schedule (one
 * read over Course and the rituals) and the calendar mirror. Schedule reads other
 * products through their services only. Visibility comes from the global module.
 */
@Module({
    imports: [
        MikroOrmModule.forFeature([
            GrowthCourseItem,
            GrowthCourseRhythm,
            GrowthCourseRhythmTick,
            GrowthCourseRitualSnooze,
            GrowthCourseFeed,
        ]),
        AccountModule,
        CoachModule,
        HouseholdSettingsModule,
        GrowthWeekCheckModule,
        MoneyWeekCheckModule,
        MonthScoreModule,
        TimeTemplateModule,
    ],
    controllers: [
        CourseController,
        RhythmController,
        CourseScheduleController,
        CourseFeedController,
        CourseCalendarController,
    ],
    providers: [
        CourseService,
        RhythmService,
        CourseScheduleService,
        CourseFeedService,
        CourseCoachService,
    ],
    exports: [CourseService, RhythmService, CourseScheduleService],
})
export class CourseModule {}
