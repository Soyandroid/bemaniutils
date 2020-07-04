# vim: set fileencoding=utf-8
import copy
import random
from typing import Any, Dict, List, Optional, Set, Tuple

from bemani.backend.jubeat.base import JubeatBase
from bemani.backend.jubeat.common import (
    JubeatDemodataGetHitchartHandler,
    JubeatDemodataGetNewsHandler,
    JubeatGamendRegisterHandler,
    JubeatGametopGetMeetingHandler,
    JubeatLobbyCheckHandler,
    JubeatLoggerReportHandler,
)
from bemani.backend.jubeat.clan import JubeatClan

from bemani.backend.base import Status
from bemani.common import Time, ValidatedDict, VersionConstants
from bemani.data import Data, Achievement, Score, Song, UserID
from bemani.protocol import Node

class JubeatFesto(
    JubeatDemodataGetHitchartHandler,
    JubeatDemodataGetNewsHandler,
    JubeatGamendRegisterHandler,
    JubeatGametopGetMeetingHandler,
    JubeatLobbyCheckHandler,
    JubeatLoggerReportHandler,
    JubeatBase,
):

    name = 'Jubeat Festo'
    version = VersionConstants.JUBEAT_FESTO

    JBOX_EMBLEM_NORMAL = 1
    JBOX_EMBLEM_PREMIUM = 2

    EVENT_STATUS_OPEN = 0x1
    EVENT_STATUS_COMPLETE = 0x2

    EVENTS = {
        5: {
            'enabled': False,
        },
        6: {
            'enabled': False,
        },
        15: {
            'enabled': True,
        },
        22: {
            'enabled': False,
        },
        23: {
            'enabled': False,
        },
        34: {
            'enabled': False,
        },
    }
    JBOX_EMBLEM_NORMAL = 1
    JBOX_EMBLEM_PREMIUM = 2

    FIVE_PLAYS_UNLOCK_EVENT_SONG_IDS = set(range(80000301, 80000348))

    COURSE_STATUS_SEEN = 0x01
    COURSE_STATUS_PLAYED = 0x02
    COURSE_STATUS_CLEARED = 0x04

    COURSE_TYPE_PERMANENT = 1
    COURSE_TYPE_TIME_BASED = 2

    COURSE_CLEAR_SCORE = 1
    COURSE_CLEAR_COMBINED_SCORE = 2
    COURSE_CLEAR_HAZARD = 3

    COURSE_HAZARD_EXC1 = 1
    COURSE_HAZARD_EXC2 = 2
    COURSE_HAZARD_EXC3 = 3
    COURSE_HAZARD_FC1 = 4
    COURSE_HAZARD_FC2 = 5
    COURSE_HAZARD_FC3 = 6

    def previous_version(self) -> Optional[JubeatBase]:
        return JubeatClan(self.data, self.config, self.model)

    @classmethod
    def run_scheduled_work(cls, data: Data, config: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
        """
        Insert daily FC challenges into the DB.
        """
        events = []
        if data.local.network.should_schedule(cls.game, cls.version, 'fc_challenge', 'daily'):
            # Generate a new list of two FC challenge songs. Skip a particular song range since these are all a single song ID.
            # Jubeat Clan has an unlock event where you have to play different charts for the same song, and the charts are
            # loaded in based on the cabinet's prefecture. So, no matter where you are, you will only see one song within this
            # range, but it will be a different ID depending on the prefecture set in settings. This means its not safe to send
            # these song IDs, so we explicitly exclude them.
            start_time, end_time = data.local.network.get_schedule_duration('daily')
            all_songs = set(song.id for song in data.local.music.get_all_songs(cls.game, cls.version) if song.id not in cls.FIVE_PLAYS_UNLOCK_EVENT_SONG_IDS)
            daily_songs = random.sample(all_songs, 2)
            data.local.game.put_time_sensitive_settings(
                cls.game,
                cls.version,
                'fc_challenge',
                {
                    'start_time': start_time,
                    'end_time': end_time,
                    'today': daily_songs[0],
                    'whim': daily_songs[1],
                },
            )
            events.append((
                'jubeat_fc_challenge_charts',
                {
                    'version': cls.version,
                    'today': daily_songs[0],
                    'whim': daily_songs[1],
                },
            ))

            # Mark that we did some actual work here.
            data.local.network.mark_scheduled(cls.game, cls.version, 'fc_challenge', 'daily')
        return events

    def __get_global_info(self) -> Node:
        info = Node.void('info')

        # Event info.
        event_info = Node.void('event_info')
        info.add_child(event_info)
        for event in self.EVENTS:
            evt = Node.void('event')
            event_info.add_child(evt)
            evt.set_attribute('type', str(event))
            evt.add_child(Node.u8('state', self.EVENT_STATUS_OPEN if self.EVENTS[event]['enabled'] else 0))

        genre_def_music = Node.void('genre_def_music')
        info.add_child(genre_def_music)

        info.add_child(Node.s32_array(
            'black_jacket_list',
            [
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
            ],
        ))

         # Some sort of music DB whitelist
        info.add_child(Node.s32_array(
            'white_music_list',
            [
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
            ],
        ))

        info.add_child(Node.s32_array(
            'white_marker_list',
            [
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
            ],
        ))

        info.add_child(Node.s32_array(
            'white_theme_list',
            [
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
            ],
        ))

        info.add_child(Node.s32_array(
            'open_music_list',
            [
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
            ],
        ))

        info.add_child(Node.s32_array(
            'shareable_music_list',
            [
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
                -1, -1, -1, -1,
            ],
        ))

        info.add_child(Node.s32_array(
            'hot_music_list',
            [
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, -4194304, -2080769, -1,
                -17, -35651587, 234555391, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
            ]
        ))

        jbox = Node.void('jbox')
        info.add_child(jbox)
        jbox.add_child(Node.s32('point', 0))
        emblem = Node.void('emblem')
        jbox.add_child(emblem)
        normal = Node.void('normal')
        emblem.add_child(normal)
        premium = Node.void('premium')
        emblem.add_child(premium)
        normal.add_child(Node.s16('index', 2))
        premium.add_child(Node.s16('index', 1))

        born = Node.void('born')
        info.add_child(born)
        born.add_child(Node.s8('status', 0))
        born.add_child(Node.s16('year', 0))

        # Collection list values should look like:
        #     <rating>
        #         <id __type="s32">songid</id>
        #         <stime __type="str">start time?</stime>
        #         <etime __type="str">end time?</etime>
        #     </node>
        collection = Node.void('collection')
        info.add_child(collection)
        collection.add_child(Node.void('rating_s'))

        konami_logo_50th = Node.void('konami_logo_50th')
        info.add_add_child(konami_logo_50th)
        konami_logo_50th.add_child(Node.bool('is_available', True))

        expert_option = Node.void('expert_option')
        info.add_child(expert_option)
        expert_option.add_child(Node.bool('is_available', True))

        all_music_matching = Node.void('all_music_matching')
        info.add_child(all_music_matching)
        all_music_matching.add_child(Node.bool('is_available', True))

        question_list = Node.void('question_list')
        info.add_child(question_list)

        department = Node.void('department')
        info.add_child(department)
        department.add_child(Node.void('pack_list'))

        return info

    def handle_shopinfo_regist_request(self, request: Node) -> Node:
        # Update the name of this cab for admin purposes
        self.update_machine_name(request.child_value('shop/name'))

        shopinfo = Node.void('shopinfo')

        data = Node.void('data')
        shopinfo.add_child(data)
        data.add_child(Node.u32('cabid', 1))
        data.add_child(Node.string('locationid', 'nowhere'))
        data.add_child(Node.u8('tax_phase', 1))

        facility = Node.void('facility')
        data.add_child(facility)
        facility.add_child(Node.u32('exist', 1))

        data.add_child(self.__get_global_info())

        return shopinfo

    def handle_demodata_get_info_request(self, request: Node) -> Node:
        root = Node.void('demodata')
        data = Node.void('data')
        root.add_child(data)
        officialnews = Node.void('officialnews')
        officialnews.set_attribute('count', '0')
        data.add_child(officialnews)
        
        return root
    def handle_demodata_get_jbox_list_request(self, request: Node) -> Node:
        root = Node.void('demodata')
        return root

    def handle_jbox_get_agreement_request(self, request: Node) -> Node:
        root = Node.void('jbox')
        root.add_child(Node.bool('is_agreement', True))
        return root

    def handle_jbox_get_list_request(self, request: Node) -> Node:
        root = Node.void('jbox')
        root.add_child(Node.void('selection_list'))
        return root

    def handle_recommend_get_recommend_request(self, request: Node) -> Node:
        recommend = Node.void('recommend')
        data = Node.void('data')
        recommend.add_child(data)

        player = Node.void('player')
        data.add_child(player)
        music_list = Node.void('music_list')
        player.add_child(music_list)

        recommended_songs: List[Song] = []
        for i, song in enumerate(recommended_songs):
            music = Node.void('music')
            music_list.add_child(music)
            music.set_attribute('order', str(i))
            music.add_child(Node.s32('music_id', song.id))
            music.add_child(Node.s8('seq', song.chart))

        return recommend

    def handle_gametop_get_info_request(self, request: Node) -> Node:
        root = Node.void('gametop')
        data = Node.void('data')
        root.add_child(data)
        data.add_child(self.__get_global_info())

        return root

    def handle_gametop_regist_request(self, request: Node) -> Node:
        data = request.child('data')
        player = data.child('player')
        refid = player.child_value('refid')
        name = player.child_value('name')
        root = self.new_profile_by_refid(refid, name)
        return root

    def handle_gametop_get_pdata_request(self, request: Node) -> Node:
        data = request.child('data')
        player = data.child('player')
        refid = player.child_value('refid')
        root = self.get_profile_by_refid(refid)
        if root is None:
            root = Node.void('gametop')
            root.set_attribute('status', str(Status.NO_PROFILE))
        return root

    def handle_gametop_get_mdata_request(self, request: Node) -> Node:
        data = request.child('data')
        player = data.child('player')
        extid = player.child_value('jid')
        root = self.get_scores_by_extid(extid)
        if root is None:
            root = Node.void('gametop')
            root.set_attribute('status', str(Status.NO_PROFILE))
        return root
        
    def handle_gameend_final_request(self, request: Node) -> Node:
        data = request.child('data')
        player = data.child('player')

        if player is not None:
            refid = player.child_value('refid')
        else:
            refid = None

        if refid is not None:
            userid = self.data.remote.user.from_refid(self.game, self.version, refid)
        else:
            userid = None

        if userid is not None:
            profile = self.get_profile(userid)

            # Grab unlock progress
            item = player.child('item')
            if item is not None:
                profile.replace_int_array('emblem_list', 96, item.child_value('emblem_list'))

            # jbox stuff
            jbox = player.child('jbox')
            jboxdict = profile.get_dict('jbox')
            if jbox is not None:
                jboxdict.replace_int('point', jbox.child_value('point'))
                emblemtype = jbox.child_value('emblem/type')
                index = jbox.child_value('emblem/index')
                if emblemtype == self.JBOX_EMBLEM_NORMAL:
                    jboxdict.replace_int('normal_index', index)
                elif emblemtype == self.JBOX_EMBLEM_PREMIUM:
                    jboxdict.replace_int('premium_index', index)
            profile.replace_dict('jbox', jboxdict)

            # Born stuff
            born = player.child('born')
            if born is not None:
                profile.replace_int('born_status', born.child_value('status'))
                profile.replace_int('born_year', born.child_value('year'))
        else:
            profile = None

        if userid is not None and profile is not None:
            self.put_profile(userid, profile)

        return Node.void('gameend')

    def format_scores(self, userid: UserID, profile: ValidatedDict, scores: List[Score]) -> Node:
        scores = self.data.remote.music.get_scores(self.game, self.version, userid)

        root = Node.void('gametop')
        datanode = Node.void('data')
        root.add_child(datanode)
        player = Node.void('player')
        datanode.add_child(player)
        player.add_child(Node.s32('jid', profile.get_int('extid')))
        playdata = Node.void('mdata_list')
        player.add_child(playdata)

        music = ValidatedDict()
        for score in scores:
            data = music.get_dict(str(score.id))
            play_cnt = data.get_int_array('play_cnt', 3)
            clear_cnt = data.get_int_array('clear_cnt', 3)
            clear_flags = data.get_int_array('clear_flags', 3)
            fc_cnt = data.get_int_array('fc_cnt', 3)
            ex_cnt = data.get_int_array('ex_cnt', 3)
            points = data.get_int_array('points', 3)

            # Replace data for this chart type
            play_cnt[score.chart] = score.plays
            clear_cnt[score.chart] = score.data.get_int('clear_count')
            fc_cnt[score.chart] = score.data.get_int('full_combo_count')
            ex_cnt[score.chart] = score.data.get_int('excellent_count')
            points[score.chart] = score.points

            # Format the clear flags
            clear_flags[score.chart] = self.GAME_FLAG_BIT_PLAYED
            if score.data.get_int('clear_count') > 0:
                clear_flags[score.chart] |= self.GAME_FLAG_BIT_CLEARED
            if score.data.get_int('full_combo_count') > 0:
                clear_flags[score.chart] |= self.GAME_FLAG_BIT_FULL_COMBO
            if score.data.get_int('excellent_count') > 0:
                clear_flags[score.chart] |= self.GAME_FLAG_BIT_EXCELLENT

            # Save chart data back
            data.replace_int_array('play_cnt', 3, play_cnt)
            data.replace_int_array('clear_cnt', 3, clear_cnt)
            data.replace_int_array('clear_flags', 3, clear_flags)
            data.replace_int_array('fc_cnt', 3, fc_cnt)
            data.replace_int_array('ex_cnt', 3, ex_cnt)
            data.replace_int_array('points', 3, points)

            # Update the ghost (untyped)
            ghost = data.get('ghost', [None, None, None])
            ghost[score.chart] = score.data.get('ghost')
            data['ghost'] = ghost

            # Save it back
            if score.id in self.FIVE_PLAYS_UNLOCK_EVENT_SONG_IDS:
                # Mirror it to every version so the score shows up regardless of
                # prefecture setting.
                for prefecture_id in self.FIVE_PLAYS_UNLOCK_EVENT_SONG_IDS:
                    music.replace_dict(str(prefecture_id), data)
            else:
                # Regular copy.
                music.replace_dict(str(score.id), data)

        for scoreid in music:
            scoredata = music.get_dict(scoreid)
            musicdata = Node.void('musicdata')
            playdata.add_child(musicdata)

            musicdata.set_attribute('music_id', scoreid)
            musicdata.add_child(Node.s32_array('play_cnt', scoredata.get_int_array('play_cnt', 3)))
            musicdata.add_child(Node.s32_array('clear_cnt', scoredata.get_int_array('clear_cnt', 3)))
            musicdata.add_child(Node.s32_array('fc_cnt', scoredata.get_int_array('fc_cnt', 3)))
            musicdata.add_child(Node.s32_array('ex_cnt', scoredata.get_int_array('ex_cnt', 3)))
            musicdata.add_child(Node.s32_array('score', scoredata.get_int_array('points', 3)))
            musicdata.add_child(Node.s8_array('clear', scoredata.get_int_array('clear_flags', 3)))
            musicdata.add_child(Node.s8_array('music_rate', [0, 0, 0]))

            for i, ghost in enumerate(scoredata.get('ghost', [None, None, None])):
                if ghost is None:
                    continue

                bar = Node.u8_array('bar', ghost)
                musicdata.add_child(bar)
                bar.set_attribute('seq', str(i))

        return root
        
    def format_profile(self, userid: UserID, profile: ValidatedDict) -> Node:
        root = Node.void('gametop')
        data = Node.void('data')
        root.add_child(data)

        # Jubeat Clan appears to allow full event overrides per-player
        data.add_child(self.__get_global_info())

        player = Node.void('player')
        data.add_child(player)

        # Basic profile info
        player.add_child(Node.string('name', profile.get_str('name', 'なし')))
        player.add_child(Node.s32('jid', profile.get_int('extid')))

        # Miscelaneous crap
        player.add_child(Node.s32('session_id', 1))
        player.add_child(Node.u64('event_flag', profile.get_int('event_flag')))

        # Player info and statistics
        info = Node.void('info')
        player.add_child(info)
        info.add_child(Node.s32('tune_cnt', profile.get_int('tune_cnt')))
        info.add_child(Node.s32('save_cnt', profile.get_int('save_cnt')))
        info.add_child(Node.s32('saved_cnt', profile.get_int('saved_cnt')))
        info.add_child(Node.s32('fc_cnt', profile.get_int('fc_cnt')))
        info.add_child(Node.s32('ex_cnt', profile.get_int('ex_cnt')))
        info.add_child(Node.s32('clear_cnt', profile.get_int('clear_cnt')))
        info.add_child(Node.s32('match_cnt', profile.get_int('match_cnt')))
        info.add_child(Node.s32('beat_cnt', profile.get_int('beat_cnt')))
        info.add_child(Node.s32('mynews_cnt', profile.get_int('mynews_cnt')))
        info.add_child(Node.s32('bonus_tune_points', profile.get_int('bonus_tune_points')))
        info.add_child(Node.bool('is_bonus_tune_played', profile.get_bool('is_bonus_tune_played')))

        # Looks to be set to true when there's an old profile, stops tutorial from
        # happening on first load.
        info.add_child(Node.bool('inherit', profile.get_bool('has_old_version')))

        # Not saved, but loaded
        info.add_child(Node.s32('mtg_entry_cnt', 123))
        info.add_child(Node.s32('mtg_hold_cnt', 456))
        info.add_child(Node.u8('mtg_result', 10))

        # Last played data, for showing cursor and such
        lastdict = profile.get_dict('last')
        last = Node.void('last')
        player.add_child(last)
        last.add_child(Node.s64('play_time', lastdict.get_int('play_time')))
        last.add_child(Node.string('shopname', lastdict.get_str('shopname')))
        last.add_child(Node.string('areaname', lastdict.get_str('areaname')))
        last.add_child(Node.s32('music_id', lastdict.get_int('music_id')))
        last.add_child(Node.s8('seq_id', lastdict.get_int('seq_id')))
        last.add_child(Node.s8('sort', lastdict.get_int('sort')))
        last.add_child(Node.s8('category', lastdict.get_int('category')))
        last.add_child(Node.s8('expert_option', lastdict.get_int('expert_option')))

        settings = Node.void('settings')
        last.add_child(settings)
        settings.add_child(Node.s8('marker', lastdict.get_int('marker')))
        settings.add_child(Node.s8('theme', lastdict.get_int('theme')))
        settings.add_child(Node.s16('title', lastdict.get_int('title')))
        settings.add_child(Node.s16('parts', lastdict.get_int('parts')))
        settings.add_child(Node.s8('rank_sort', lastdict.get_int('rank_sort')))
        settings.add_child(Node.s8('combo_disp', lastdict.get_int('combo_disp')))
        settings.add_child(Node.s16_array('emblem', lastdict.get_int_array('emblem', 5)))
        settings.add_child(Node.s8('matching', lastdict.get_int('matching')))
        settings.add_child(Node.s8('hard', lastdict.get_int('hard')))
        settings.add_child(Node.s8('hazard', lastdict.get_int('hazard')))

        # Secret unlocks
        item = Node.void('item')
        player.add_child(item)
        item.add_child(Node.s32_array('music_list', profile.get_int_array('music_list', 64, [-1] * 64)))
        item.add_child(Node.s32_array('secret_list', profile.get_int_array('secret_list', 64, [-1] * 64)))
        item.add_child(Node.s32_array('theme_list', profile.get_int_array('theme_list', 16, [-1] * 16)))
        item.add_child(Node.s32_array('marker_list', profile.get_int_array('marker_list', 16, [-1] * 16)))
        item.add_child(Node.s32_array('title_list', profile.get_int_array('title_list', 160, [-1] * 160)))
        item.add_child(Node.s32_array('parts_list', profile.get_int_array('parts_list', 160, [-1] * 160)))
        item.add_child(Node.s32_array('emblem_list', profile.get_int_array('emblem_list', 96, [-1] * 96)))
        item.add_child(Node.s32_array('commu_list', profile.get_int_array('commu_list', 16, [-1] * 16)))

        new = Node.void('new')
        item.add_child(new)
        new.add_child(Node.s32_array('secret_list', profile.get_int_array('secret_list_new', 64, [-1] * 64)))
        new.add_child(Node.s32_array('theme_list', profile.get_int_array('theme_list_new', 16, [-1] * 16)))
        new.add_child(Node.s32_array('marker_list', profile.get_int_array('marker_list_new', 16, [-1] * 16)))

        # Add rivals to profile.
        rivallist = Node.void('rivallist')
        player.add_child(rivallist)

        links = self.data.local.user.get_links(self.game, self.version, userid)
        rivalcount = 0
        for link in links:
            if link.type != 'rival':
                continue

            rprofile = self.get_profile(link.other_userid)
            if rprofile is None:
                continue

            rival = Node.void('rival')
            rivallist.add_child(rival)
            rival.add_child(Node.s32('jid', rprofile.get_int('extid')))
            rival.add_child(Node.string('name', rprofile.get_str('name')))

            # This looks like a carry-over from prop's career and isn't displayed.
            career = Node.void('career')
            rival.add_child(career)
            career.add_child(Node.s16('level', 1))

            # Lazy way of keeping track of rivals, since we can only have 3
            # or the game with throw up.
            rivalcount += 1
            if rivalcount >= 3:
                break

        rivallist.set_attribute('count', str(rivalcount))

        lab_edit_seq = Node.void('lab_edit_seq')
        player.add_child(lab_edit_seq)
        lab_edit_seq.set_attribute('count', '0')

        # Full combo challenge
        entry = self.data.local.game.get_time_sensitive_settings(self.game, self.version, 'fc_challenge')
        if entry is None:
            entry = ValidatedDict()

        # Figure out if we've played these songs
        start_time, end_time = self.data.local.network.get_schedule_duration('daily')
        today_attempts = self.data.local.music.get_all_attempts(self.game, self.version, userid, entry.get_int('today', -1), timelimit=start_time)
        whim_attempts = self.data.local.music.get_all_attempts(self.game, self.version, userid, entry.get_int('whim', -1), timelimit=start_time)

        fc_challenge = Node.void('fc_challenge')
        player.add_child(fc_challenge)
        today = Node.void('today')
        fc_challenge.add_child(today)
        today.add_child(Node.s32('music_id', entry.get_int('today', -1)))
        today.add_child(Node.u8('state', 0x40 if len(today_attempts) > 0 else 0x0))
        whim = Node.void('whim')
        fc_challenge.add_child(whim)
        whim.add_child(Node.s32('music_id', entry.get_int('whim', -1)))
        whim.add_child(Node.u8('state', 0x40 if len(whim_attempts) > 0 else 0x0))

        # No news, ever.
        official_news = Node.void('official_news')
        player.add_child(official_news)
        news_list = Node.void('news_list')
        official_news.add_child(news_list)

        # Sane defaults for unknown/who cares nodes
        history = Node.void('history')
        player.add_child(history)
        history.set_attribute('count', '0')

        free_first_play = Node.void('free_first_play')
        player.add_child(free_first_play)
        free_first_play.add_child(Node.bool('is_available', False))

        # Player status for events
        event_info = Node.void('event_info')
        player.add_child(event_info)
        achievements = self.data.local.user.get_achievements(self.game, self.version, userid)
        event_completion: Dict[int, bool] = {}
        course_completion: Dict[int, ValidatedDict] = {}
        for achievement in achievements:
            if achievement.type == 'event':
                event_completion[achievement.id] = achievement.data.get_bool('is_completed')
            if achievement.type == 'course':
                course_completion[achievement.id] = achievement.data


        # JBox stuff
        jbox = Node.void('jbox')
        jboxdict = profile.get_dict('jbox')
        player.add_child(jbox)
        jbox.add_child(Node.s32('point', jboxdict.get_int('point')))
        emblem = Node.void('emblem')
        jbox.add_child(emblem)
        normal = Node.void('normal')
        emblem.add_child(normal)
        premium = Node.void('premium')
        emblem.add_child(premium)

        # Calculate a random index for normal and premium to give to player
        # as a gatcha.
        gameitems = self.data.local.game.get_items(self.game, self.version)
        normalemblems: Set[int] = set()
        premiumemblems: Set[int] = set()
        for gameitem in gameitems:
            if gameitem.type == 'emblem':
                if gameitem.data.get_int('rarity') in {1, 2, 3}:
                    normalemblems.add(gameitem.id)
                if gameitem.data.get_int('rarity') in {3, 4, 5}:
                    premiumemblems.add(gameitem.id)

        # Default to some emblems in case the catalog is not available.
        normalindex = 2
        premiumindex = 1
        if normalemblems:
            normalindex = random.sample(normalemblems, 1)[0]
        if premiumemblems:
            premiumindex = random.sample(premiumemblems, 1)[0]

        normal.add_child(Node.s16('index', normalindex))
        premium.add_child(Node.s16('index', premiumindex))

        # New Music stuff
        new_music = Node.void('new_music')
        player.add_child(new_music)

        navi = Node.void('navi')
        player.add_child(navi)
        navi.add_child(Node.u64('flag', profile.get_int('navi_flag')))

        # Gift list, maybe from other players?
        gift_list = Node.void('gift_list')
        player.add_child(gift_list)
        # If we had gifts, they look like this:
        #     <gift reason="??" kind="??">
        #         <id __type="s32">??</id>
        #     </gift>

        # Birthday event?
        born = Node.void('born')
        player.add_child(born)
        born.add_child(Node.s8('status', profile.get_int('born_status')))
        born.add_child(Node.s16('year', profile.get_int('born_year')))

        # More crap
        question_list = Node.void('question_list')
        player.add_child(question_list)

        # Union Battle
        union_battle = Node.void('union_battle')
        player.add_child(union_battle)
        union_battle.set_attribute('id', "-1")
        union_battle.add_child(Node.s32("power", 0))

        # Some server node
        server = Node.void('server')
        player.add_child(server)

        # Another unknown gift list?
        eamuse_gift_list = Node.void('eamuse_gift_list')
        player.add_child(eamuse_gift_list)

        category_list = Node.void('category_list')
        player.add_child(category_list)

        # Each category has one of the following nodes
        for categoryid in range(1, 7):
            category = Node.void('category')
            category_list.add_child(category)
            category.set_attribute('id', str(categoryid))
            category.add_child(Node.bool('is_display', True))

        # Drop list
        drop_list = Node.void('drop_list')
        player.add_child(drop_list)

        dropachievements: Dict[int, Achievement] = {}
        for achievement in achievements:
            if achievement.type == 'drop':
                dropachievements[achievement.id] = achievement

        for dropid in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
            if dropid in dropachievements:
                dropdata = dropachievements[dropid].data
            else:
                dropdata = ValidatedDict()

            drop = Node.void('drop')
            drop_list.add_child(drop)
            drop.set_attribute('id', str(dropid))
            drop.add_child(Node.s32('exp', dropdata.get_int('exp', -1)))
            drop.add_child(Node.s32('flag', dropdata.get_int('flag', 0)))

            item_list = Node.void('item_list')
            drop.add_child(item_list)

            for itemid in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
                item = Node.void('item')
                item_list.add_child(item)
                item.set_attribute('id', str(itemid))
                item.add_child(Node.s32('num', dropdata.get_int(f'item_{itemid}')))

        # Emo node added in festo
        emo_list = Node.void("emo_list")
        player.add_child(emo_list)
        
        # Fill in category
        fill_in_category = Node.void('fill_in_category')
        player.add_child(fill_in_category)
        normal = Node.void('normal')
        fill_in_category.add_child(normal)
        normal.add_child(Node.s32_array('no_gray_flag_list', profile.get_int_array('no_gray_flag_list', 16, [-1] * 16)))
        normal.add_child(Node.s32_array('all_yellow_flag_list', profile.get_int_array('all_yellow_flag_list', 16, [-1] * 16)))
        normal.add_child(Node.s32_array('full_combo_flag_list', profile.get_int_array('full_combo_flag_list', 16, [-1] * 16)))
        normal.add_child(Node.s32_array('excellent_flag_list', profile.get_int_array('excellent_flag_list', 16, [-1] * 16)))

        # Daily Bonus
        daily_bonus_list = Node.void('daily_bonus_list')
        player.add_child(daily_bonus_list)

        # Tickets
        ticket_list = Node.void('ticket_list')
        player.add_child(ticket_list)

        return root
