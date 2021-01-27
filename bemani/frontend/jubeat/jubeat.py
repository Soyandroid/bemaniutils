# vim: set fileencoding=utf-8
from typing import Any, Dict, Iterator, Tuple, List

from bemani.backend.jubeat import JubeatFactory, JubeatBase
from bemani.common import ValidatedDict, GameConstants, VersionConstants
from bemani.data import Attempt, Score, Song, UserID
from bemani.frontend.base import FrontendBase


class JubeatFrontend(FrontendBase):

    game = GameConstants.JUBEAT

    valid_charts = [
        JubeatBase.CHART_TYPE_BASIC,
        JubeatBase.CHART_TYPE_ADVANCED,
        JubeatBase.CHART_TYPE_EXTREME,
        JubeatBase.CHART_TYPE_HARD_BASIC,
        JubeatBase.CHART_TYPE_HARD_ADVANCED,
        JubeatBase.CHART_TYPE_HARD_EXTREME,
    ]

    valid_rival_types = ['rival']

    def all_games(self) -> Iterator[Tuple[str, int, str]]:
        yield from JubeatFactory.all_games()

    def sanitized_games(self) -> Iterator[Tuple[str, int, str]]:
        mapping = {
            VersionConstants.JUBEAT: 1,
            VersionConstants.JUBEAT_RIPPLES: 2,
            VersionConstants.JUBEAT_KNIT: 3,
            VersionConstants.JUBEAT_COPIOUS: 4,
            VersionConstants.JUBEAT_SAUCER: 5,
            VersionConstants.JUBEAT_PROP: 6,
            VersionConstants.JUBEAT_QUBELL: 7,
            VersionConstants.JUBEAT_CLAN: 8,
            VersionConstants.JUBEAT_FESTO: 9,
        }

        for (game, version, name) in self.all_games():
            if version in mapping:
                yield (game, mapping[version], name)
        yield (GameConstants.JUBEAT, 10, 'Jubeat Extend')

    def get_all_items(self, versions: list) -> Dict[str, List[Dict[str, Any]]]:
        result = {}
        for version in versions:
            emblem = self.__format_jubeat_extras(version)
            result[version] = emblem['emblems']
        return result

    def __format_jubeat_extras(self, version: int) -> Dict[str, List[Dict[str, Any]]]:
        # Gotta look up the unlock catalog
        items = self.data.local.game.get_items(self.game, version)

        # Format it depending on the version
        if version in {
            VersionConstants.JUBEAT_PROP,
            VersionConstants.JUBEAT_QUBELL,
            VersionConstants.JUBEAT_CLAN,
            VersionConstants.JUBEAT_FESTO,
        }:
            return {
                "emblems": [
                    {
                        "index": str(item.id),
                        "song": item.data.get_int("music_id"),
                        "layer": item.data.get_int("layer"),
                        "evolved": item.data.get_int("evolved"),
                        "rarity": item.data.get_int("rarity"),
                        "name": item.data.get_str("name"),
                    }
                    for item in items
                    if item.type == "emblem"
                ],
            }
        else:
            return {"emblems": []}

    def format_score(self, userid: UserID, score: Score) -> Dict[str, Any]:
        formatted_score = super().format_score(userid, score)
        formatted_score['combo'] = score.data.get_int('combo', -1)
        formatted_score['medal'] = score.data.get_int('medal')
        formatted_score['status'] = {
            JubeatBase.PLAY_MEDAL_FAILED: "FAILED",
            JubeatBase.PLAY_MEDAL_CLEARED: "CLEARED",
            JubeatBase.PLAY_MEDAL_NEARLY_FULL_COMBO: "NEARLY FULL COMBO",
            JubeatBase.PLAY_MEDAL_FULL_COMBO: "FULL COMBO",
            JubeatBase.PLAY_MEDAL_NEARLY_EXCELLENT: "NEARLY EXCELLENT",
            JubeatBase.PLAY_MEDAL_EXCELLENT: "EXCELLENT",
        }.get(score.data.get_int('medal'), 'NO PLAY')
        formatted_score['music_rate'] = score.data.get_int('music_rate', 0) / 10
        formatted_score["clear_cnt"] = score.data.get_int('clear_count', 0)
        return formatted_score

    def format_attempt(self, userid: UserID, attempt: Attempt) -> Dict[str, Any]:
        formatted_attempt = super().format_attempt(userid, attempt)
        formatted_attempt['combo'] = attempt.data.get_int('combo', -1)
        formatted_attempt['medal'] = attempt.data.get_int('medal')
        formatted_attempt['status'] = {
            JubeatBase.PLAY_MEDAL_FAILED: "FAILED",
            JubeatBase.PLAY_MEDAL_CLEARED: "CLEARED",
            JubeatBase.PLAY_MEDAL_NEARLY_FULL_COMBO: "NEARLY FULL COMBO",
            JubeatBase.PLAY_MEDAL_FULL_COMBO: "FULL COMBO",
            JubeatBase.PLAY_MEDAL_NEARLY_EXCELLENT: "NEARLY EXCELLENT",
            JubeatBase.PLAY_MEDAL_EXCELLENT: "EXCELLENT",
        }.get(attempt.data.get_int('medal'), 'NO PLAY')
        formatted_attempt['music_rate'] = attempt.data.get_int('music_rate', 0) / 10
        return formatted_attempt

    def format_emblem(self, emblem: list) -> Dict[str, Any]:
        return {
            'background': emblem[0],
            'main': emblem[1],
            'ornament': emblem[2],
            'effect': emblem[3],
            'speech_bubble': emblem[4],
        }

    def format_profile(self, profile: ValidatedDict, playstats: ValidatedDict) -> Dict[str, Any]:
        formatted_profile = super().format_profile(profile, playstats)
        formatted_profile['plays'] = playstats.get_int('total_plays')
        formatted_profile['emblem'] = self.format_emblem(profile.get_dict('last').get_int_array('emblem', 5))
        return formatted_profile

    def format_song(self, song: Song) -> Dict[str, Any]:
        difficulties = [0, 0, 0, 0, 0, 0]
        difficulties[song.chart] = song.data.get_int('difficulty', 13)

        formatted_song = super().format_song(song)
        formatted_song['bpm_min'] = song.data.get_int('bpm_min', 120)
        formatted_song['bpm_max'] = song.data.get_int('bpm_max', 120)
        formatted_song['difficulties'] = difficulties
        return formatted_song

    def merge_song(self, existing: Dict[str, Any], new: Song) -> Dict[str, Any]:
        new_song = super().merge_song(existing, new)
        if existing['difficulties'][new.chart] == 0:
            new_song['difficulties'][new.chart] = new.data.get_int('difficulty', 13)
        return new_song
