# vim: set fileencoding=utf-8
from typing import Optional

from bemani.backend.reflec.base import ReflecBeatBase
from bemani.backend.reflec.volzza2 import ReflecBeatVolzza2
from bemani.common import VersionConstants


class ReflecBeatReflesia(ReflecBeatBase):

    name = "REFLEC BEAT 悠久のリフレシア"
    version = VersionConstants.REFLEC_BEAT_REFLESIA

    def previous_version(self) -> Optional[ReflecBeatBase]:
        return ReflecBeatVolzza2(self.data, self.config, self.model)
