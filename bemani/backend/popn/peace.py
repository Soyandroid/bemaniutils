# vim: set fileencoding=utf-8
import random
from typing import Any, Dict, List, Optional, Tuple

from bemani.backend.popn.base import PopnMusicBase
from bemani.backend.popn.usaneko import PopnMusicUsaNeko
from bemani.common import VersionConstants
from bemani.data import Data


class PopnMusicPeace(PopnMusicUsaNeko):

    name = "Pop'n Music peace"
    version = VersionConstants.POPN_MUSIC_PEACE

    # Catalog types
    GAME_CATALOG_TYPE_SONG = 0
    # Chart type, as returned from the game
    GAME_CHART_TYPE_EASY = 0
    GAME_CHART_TYPE_NORMAL = 1
    GAME_CHART_TYPE_HYPER = 2
    GAME_CHART_TYPE_EX = 3

    # Medal type, as returned from the game
    GAME_PLAY_MEDAL_CIRCLE_FAILED = 1
    GAME_PLAY_MEDAL_DIAMOND_FAILED = 2
    GAME_PLAY_MEDAL_STAR_FAILED = 3
    GAME_PLAY_MEDAL_EASY_CLEAR = 4
    GAME_PLAY_MEDAL_CIRCLE_CLEARED = 5
    GAME_PLAY_MEDAL_DIAMOND_CLEARED = 6
    GAME_PLAY_MEDAL_STAR_CLEARED = 7
    GAME_PLAY_MEDAL_CIRCLE_FULL_COMBO = 8
    GAME_PLAY_MEDAL_DIAMOND_FULL_COMBO = 9
    GAME_PLAY_MEDAL_STAR_FULL_COMBO = 10
    GAME_PLAY_MEDAL_PERFECT = 11

    # Rank type, as returned from the game
    GAME_PLAY_RANK_E = 1
    GAME_PLAY_RANK_D = 2
    GAME_PLAY_RANK_C = 3
    GAME_PLAY_RANK_B = 4
    GAME_PLAY_RANK_A = 5
    GAME_PLAY_RANK_AA = 6
    GAME_PLAY_RANK_AAA = 7
    GAME_PLAY_RANK_S = 8

    # Biggest ID in the music DB
    GAME_MAX_MUSIC_ID = 1877

    @classmethod
    def get_settings(cls) -> Dict[str, Any]:
        """
        Return all of our front-end modifiably settings.
        """
        return {
            'bools': [
                {
                    'name': 'Force Song Unlock',
                    'tip': 'Force unlock all songs.',
                    'category': 'game_config',
                    'setting': 'force_unlock_songs',
                },
            ],
        }

    def previous_version(self) -> Optional[PopnMusicBase]:
        return PopnMusicUsaNeko(self.data, self.config, self.model)

    def extra_services(self) -> List[str]:
        """
        Return the local2 and lobby2 service so that Pop'n Music 24 will
        send game packets.
        """
        return [
            'local2',
            'lobby2',
        ]

    @classmethod
    def run_scheduled_work(cls, data: Data, config: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
        """
        Once a week, insert a new course.
        """
        events = []
        if data.local.network.should_schedule(cls.game, cls.version, 'course', 'weekly'):
            # Generate a new course list, save it to the DB.
            start_time, end_time = data.local.network.get_schedule_duration('weekly')
            all_songs = [song.id for song in data.local.music.get_all_songs(cls.game, cls.version)]
            course_song = random.choice(all_songs)
            data.local.game.put_time_sensitive_settings(
                cls.game,
                cls.version,
                'course',
                {
                    'start_time': start_time,
                    'end_time': end_time,
                    'music': course_song,
                },
            )
            events.append((
                'pnm_course',
                {
                    'version': cls.version,
                    'song': course_song,
                },
            ))

            # Mark that we did some actual work here.
            data.local.network.mark_scheduled(cls.game, cls.version, 'course', 'weekly')
        return events
