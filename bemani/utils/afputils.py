#! /usr/bin/env python3
import argparse
import os
import os.path
import struct
import sys
import textwrap
from PIL import Image  # type: ignore
from typing import Any, Dict, List, Optional, Tuple

from bemani.format.dxt import DXTBuffer
from bemani.protocol.binary import BinaryEncoding
from bemani.protocol.lz77 import Lz77
from bemani.protocol.node import Node


class PMAN:
    def __init__(
        self,
        entries: List[str] = [],
        flags1: int = 0,
        flags2: int = 0,
        flags3: int = 0,
    ) -> None:
        self.entries = entries
        self.flags1 = flags1
        self.flags2 = flags2
        self.flags3 = flags3


class Texture:
    def __init__(
        self,
        name: str,
        width: int,
        height: int,
        fmt: int,
        header_flags1: int,
        header_flags2: int,
        header_flags3: int,
        unk_flags1: int,
        unk_flags2: int,
        unk_flags3: int,
        unk_flags4: int,
        rawdata: bytes,
        imgdata: Any,
    ) -> None:
        self.name = name
        self.width = width
        self.height = height
        self.fmt = fmt
        self.header_flags1 = header_flags1
        self.header_flags2 = header_flags2
        self.header_flags3 = header_flags3
        self.unk_flags1 = unk_flags1
        self.unk_flags2 = unk_flags2
        self.unk_flags3 = unk_flags3
        self.unk_flags4 = unk_flags4
        self.raw = rawdata
        self.img = imgdata


class TextureRegion:
    def __init__(self, textureno: int, left: int, top: int, right: int, bottom: int) -> None:
        self.textureno = textureno
        self.left = left
        self.top = top
        self.right = right
        self.bottom = bottom


class Animation:
    def __init__(
        self,
        name: str,
        data: bytes,
        header: bytes = b"",
    ) -> None:
        self.name = name
        self.data = data
        self.header = header


class Shape:
    def __init__(
        self,
        name: str,
        data: bytes,
    ) -> None:
        self.name = name
        self.data = data


class Unknown1:
    def __init__(
        self,
        name: str,
        data: bytes,
    ) -> None:
        self.name = name
        self.data = data
        if len(data) != 12:
            raise Exception("Unexpected length for Unknown1 structure!")


class Unknown2:
    def __init__(
        self,
        data: bytes,
    ) -> None:
        self.data = data
        if len(data) != 4:
            raise Exception("Unexpected length for Unknown2 structure!")


class AFPFile:
    def __init__(self, contents: bytes, verbose: bool = False) -> None:
        # Initialize coverage. This is used to help find missed/hidden file
        # sections that we aren't parsing correctly.
        self.coverage: List[bool] = [False] * len(contents)

        # Original file data that we parse into structures.
        self.data = contents

        # Font data encoding handler. We keep this around as it manages
        # remembering the actual BinXML encoding.
        self.benc = BinaryEncoding()

        # All of the crap!
        self.endian: str = "<"
        self.features: int = 0
        self.file_flags: bytes = b""
        self.text_obfuscated: bool = False
        self.legacy_lz: bool = False
        self.modern_lz: bool = False

        # If we encounter parts of the file that we don't know how to read
        # or save, we drop into read-only mode and throw if somebody tries
        # to update the file.
        self.read_only: bool = False

        # List of all textures in this file. This is unordered, textures should
        # be looked up by name.
        self.textures: List[Texture] = []

        # Texture mapping, which allows other structures to refer to texture
        # by number instead of name.
        self.texturemap: PMAN = PMAN()

        # List of all regions found inside textures, mapped to their textures
        # using texturenos that can be looked up using the texturemap above.
        # This structure is ordered, and the regionno from the regionmap
        # below can be used to look into this structure.
        self.texture_to_region: List[TextureRegion] = []

        # Region mapping, which allows other structures to refer to regions
        # by number instead of name.
        self.regionmap: PMAN = PMAN()

        # Animations(?) and their names found in this file. This is unordered,
        # animations should be looked up by name.
        self.animations: List[Animation] = []

        # Animation(?) mapping, which allows other structures to refer to
        # animations by number instead of name.
        self.animmap: PMAN = PMAN()

        # Font information (mapping for various coepoints to their region in
        # a particular font texture.
        self.fontdata: Optional[Node] = None

        # Shapes(?) with their raw data.
        self.shapes: List[Shape] = []

        # Shape(?) mapping, not understood or used.
        self.shapemap: PMAN = PMAN()

        # Unknown data structures that we have to roundtrip. They correlate to
        # the PMAN structures below.
        self.unknown1: List[Unknown1] = []
        self.unknown2: List[Unknown2] = []

        # Unknown PMAN structures that we have to roundtrip. They correlate to
        # the unknown data structures above.
        self.unk_pman1: PMAN = PMAN()
        self.unk_pman2: PMAN = PMAN()

        # Parse out the file structure.
        self.__parse(verbose)

    def add_coverage(self, offset: int, length: int, unique: bool = True) -> None:
        for i in range(offset, offset + length):
            if self.coverage[i] and unique:
                raise Exception(f"Already covered {hex(offset)}!")
            self.coverage[i] = True

    def print_coverage(self) -> None:
        # First offset that is not coverd in a run.
        start = None

        for offset, covered in enumerate(self.coverage):
            if covered:
                if start is not None:
                    print(f"Uncovered: {hex(start)} - {hex(offset)} ({offset-start} bytes)")
                    start = None
            else:
                if start is None:
                    start = offset
        if start is not None:
            # Print final range
            offset = len(self.coverage)
            print(f"Uncovered: {hex(start)} - {hex(offset)} ({offset-start} bytes)")

    @staticmethod
    def cap32(val: int) -> int:
        return val & 0xFFFFFFFF

    @staticmethod
    def poly(val: int) -> int:
        if (val >> 31) & 1 != 0:
            return 0x4C11DB7
        else:
            return 0

    @staticmethod
    def crc32(bytestream: bytes) -> int:
        # Janky 6-bit CRC for ascii names in PMAN structures.
        result = 0
        for byte in bytestream:
            for i in range(6):
                result = AFPFile.poly(result) ^ AFPFile.cap32((result << 1) | ((byte >> i) & 1))
        return result

    @staticmethod
    def descramble_text(text: bytes, obfuscated: bool) -> str:
        if len(text):
            if obfuscated and (text[0] - 0x20) > 0x7F:
                # Gotta do a weird demangling where we swap the
                # top bit.
                return bytes(((x + 0x80) & 0xFF) for x in text).decode('ascii')
            else:
                return text.decode('ascii')
        else:
            return ""

    @staticmethod
    def scramble_text(text: str, obfuscated: bool) -> bytes:
        if obfuscated:
            return bytes(((x + 0x80) & 0xFF) for x in text.encode('ascii')) + b'\0'
        else:
            return text.encode('ascii') + b'\0'

    def get_until_null(self, offset: int) -> bytes:
        out = b""
        while self.data[offset] != 0:
            out += self.data[offset:(offset + 1)]
            offset += 1
        return out

    def descramble_pman(self, offset: int) -> PMAN:
        # Unclear what the first three unknowns are, but the fourth
        # looks like it could possibly be two int16s indicating unknown?
        magic, expect_zero, flags1, flags2, numentries, flags3, data_offset = struct.unpack(
            f"{self.endian}4sIIIIII",
            self.data[offset:(offset + 28)],
        )
        self.add_coverage(offset, 28)

        # I have never seen the first unknown be anything other than zero,
        # so lets lock that down.
        if expect_zero != 0:
            raise Exception("Got a non-zero value for expected zero location in PMAN!")

        if self.endian == "<" and magic != b"PMAN":
            raise Exception("Invalid magic value in PMAN structure!")
        if self.endian == ">" and magic != b"NAMP":
            raise Exception("Invalid magic value in PMAN structure!")

        names: List[Optional[str]] = [None] * numentries
        if numentries > 0:
            # Jump to the offset, parse it out
            for i in range(numentries):
                file_offset = data_offset + (i * 12)
                name_crc, entry_no, nameoffset = struct.unpack(
                    f"{self.endian}III",
                    self.data[file_offset:(file_offset + 12)],
                )
                self.add_coverage(file_offset, 12)

                if nameoffset == 0:
                    raise Exception("Expected name offset in PMAN data!")

                bytedata = self.get_until_null(nameoffset)
                self.add_coverage(nameoffset, len(bytedata) + 1, unique=False)
                name = AFPFile.descramble_text(bytedata, self.text_obfuscated)
                names[entry_no] = name

                if name_crc != AFPFile.crc32(name.encode('ascii')):
                    raise Exception(f"Name CRC failed for {name}")

        for i, name in enumerate(names):
            if name is None:
                raise Exception(f"Didn't get mapping for entry {i + 1}")

        return PMAN(
            entries=names,
            flags1=flags1,
            flags2=flags2,
            flags3=flags3,
        )

    def __parse(
        self,
        verbose: bool = False,
    ) -> None:
        # Suppress debug text unless asked
        if verbose:
            vprint = print
        else:
            def vprint(*args: Any, **kwargs: Any) -> None:  # type: ignore
                pass

        # First, check the signature
        if self.data[0:4] == b"2PXT":
            self.endian = "<"
        elif self.data[0:4] == b"TXP2":
            self.endian = ">"
        else:
            raise Exception("Invalid graphic file format!")
        self.add_coverage(0, 4)

        # Not sure what words 2 and 3 are, they seem to be some sort of
        # version or date?
        self.file_flags = self.data[4:12]
        self.add_coverage(4, 8)

        # Now, grab the file length, verify that we have the right amount
        # of data.
        length = struct.unpack(f"{self.endian}I", self.data[12:16])[0]
        self.add_coverage(12, 4)
        if length != len(self.data):
            raise Exception(f"Invalid graphic file length, expecting {length} bytes!")

        # I think that offset 16-20 are the file data offset, but I'm not sure?
        header_length = struct.unpack(f"{self.endian}I", self.data[16:20])[0]
        self.add_coverage(16, 4)

        # Now, the meat of the file format. Bytes 20-24 are a bitfield for
        # what parts of the header exist in the file. We need to understand
        # each bit so we know how to skip past each section.
        feature_mask = struct.unpack(f"{self.endian}I", self.data[20:24])[0]
        self.add_coverage(20, 4)
        header_offset = 24

        # Lots of magic happens if this bit is set.
        self.text_obfuscated = bool(feature_mask & 0x20)
        self.legacy_lz = bool(feature_mask & 0x04)
        self.modern_lz = bool(feature_mask & 0x40000)
        self.features = feature_mask

        if feature_mask & 0x01:
            # List of textures that exist in the file, with pointers to their data.
            length, offset = struct.unpack(f"{self.endian}II", self.data[header_offset:(header_offset + 8)])
            self.add_coverage(header_offset, 8)
            header_offset += 8

            texturenames = []
            for x in range(length):
                interesting_offset = offset + (x * 12)
                if interesting_offset != 0:
                    name_offset, texture_length, texture_offset = struct.unpack(
                        f"{self.endian}III",
                        self.data[interesting_offset:(interesting_offset + 12)],
                    )
                    self.add_coverage(interesting_offset, 12)

                    if name_offset != 0:
                        # Let's decode this until the first null.
                        bytedata = self.get_until_null(name_offset)
                        self.add_coverage(name_offset, len(bytedata) + 1, unique=False)
                        name = AFPFile.descramble_text(bytedata, self.text_obfuscated)
                        texturenames.append(name)

                    if texture_offset != 0:
                        if self.legacy_lz:
                            raise Exception("We don't support legacy lz mode!")
                        elif self.modern_lz:
                            # Get size, round up to nearest power of 4
                            inflated_size, deflated_size = struct.unpack(
                                ">II",
                                self.data[texture_offset:(texture_offset + 8)],
                            )
                            self.add_coverage(texture_offset, 8)
                            if deflated_size != (texture_length - 8):
                                raise Exception("We got an incorrect length for lz texture!")
                            inflated_size = (inflated_size + 3) & (~3)

                            # Get the data offset.
                            lz_data_offset = texture_offset + 8
                            lz_data = self.data[lz_data_offset:(lz_data_offset + deflated_size)]
                            self.add_coverage(lz_data_offset, deflated_size)

                            # This takes forever, so skip it if we're pretending.
                            lz77 = Lz77()
                            raw_data = lz77.decompress(lz_data)
                        else:
                            inflated_size, deflated_size = struct.unpack(
                                ">II",
                                self.data[texture_offset:(texture_offset + 8)],
                            )

                            # I'm guessing how raw textures work because I haven't seen them.
                            # I assume they're like the above, so lets put in some asertions.
                            if deflated_size != (texture_length - 8):
                                raise Exception("We got an incorrect length for raw texture!")
                            raw_data = self.data[(texture_offset + 8):(texture_offset + 8 + deflated_size)]
                            self.add_coverage(texture_offset, deflated_size + 8)

                        (
                            magic,
                            header_flags1,
                            header_flags2,
                            raw_length,
                            width,
                            height,
                            fmtflags,
                            expected_zero1,
                            expected_zero2,
                        ) = struct.unpack(
                            f"{self.endian}4sIIIHHIII",
                            raw_data[0:32],
                        )
                        if raw_length != len(raw_data):
                            raise Exception("Invalid texture length!")
                        # I have only ever observed the following values across two different games.
                        # Don't want to keep the chunk around so let's assert our assumptions.
                        if (expected_zero1 | expected_zero2) != 0:
                            raise Exception("Found unexpected non-zero value in texture header!")
                        if raw_data[32:44] != b'\0' * 12:
                            raise Exception("Found unexpected non-zero value in texture header!")
                        # This is almost ALWAYS 3, but I've seen it be 1 as well, so I guess we have to
                        # round-trip it if we want to write files back out. I have no clue what it's for.
                        # I've seen it be 1 only on files used for fonts so far, but I am not sure there
                        # is any correlation there.
                        header_flags3 = struct.unpack(f"{self.endian}I", raw_data[44:48])[0]
                        if raw_data[48:64] != b'\0' * 16:
                            raise Exception("Found unexpected non-zero value in texture header!")
                        fmt = fmtflags & 0xFF

                        # Extract flags that the game cares about.
                        flags1 = (fmtflags >> 24) & 0xFF
                        flags2 = (fmtflags >> 16) & 0xFF

                        # These flags may have some significance, such as
                        # the unk3/unk4 possibly indicating texture doubling?
                        unk1 = 3 if (flags1 & 0xF == 1) else 1
                        unk2 = 3 if ((flags1 >> 4) & 0xF == 1) else 1
                        unk3 = 1 if (flags2 & 0xF == 1) else 2
                        unk4 = 1 if ((flags2 >> 4) & 0xF == 1) else 2

                        if self.endian == "<" and magic != b"TDXT":
                            raise Exception("Unexpected texture format!")
                        if self.endian == ">" and magic != b"TXDT":
                            raise Exception("Unexpected texture format!")

                        if fmt == 0x0B:
                            # 16-bit 565 color RGB format.
                            newdata = []
                            for i in range(width * height):
                                pixel = struct.unpack(
                                    f"{self.endian}H",
                                    raw_data[(64 + (i * 2)):(66 + (i * 2))],
                                )[0]
                                red = ((pixel >> 0) & 0x1F) << 3
                                green = ((pixel >> 5) & 0x3F) << 2
                                blue = ((pixel >> 11) & 0x1F) << 3
                                newdata.append(
                                    struct.pack("<BBB", blue, green, red)
                                )
                            img = Image.frombytes(
                                'RGB', (width, height), b''.join(newdata), 'raw', 'RGB',
                            )
                        elif fmt == 0x0E:
                            # RGB image, no alpha.
                            img = Image.frombytes(
                                'RGB', (width, height), raw_data[64:], 'raw', 'RGB',
                            )
                        # 0x10 = Seems to be some sort of RGB with color swapping.
                        elif fmt == 0x15:
                            # RGBA format.
                            # TODO: The colors are wrong on this, need to investigate
                            # further.
                            img = Image.frombytes(
                                'RGBA', (width, height), raw_data[64:], 'raw', 'BGRA',
                            )
                        elif fmt == 0x16:
                            # DXT1 format.
                            dxt = DXTBuffer(width, height)
                            img = Image.frombuffer(
                                'RGBA',
                                (width, height),
                                dxt.DXT1Decompress(raw_data[64:], endian=self.endian),
                                'raw',
                                'RGBA',
                                0,
                                1,
                            )
                        elif fmt == 0x1A:
                            # DXT5 format.
                            dxt = DXTBuffer(width, height)
                            img = Image.frombuffer(
                                'RGBA',
                                (width, height),
                                dxt.DXT5Decompress(raw_data[64:], endian=self.endian),
                                'raw',
                                'RGBA',
                                0,
                                1,
                            )
                        # 0x1E = I have no idea what format this is.
                        elif fmt == 0x1F:
                            # 16-bit 4-4-4-4 RGBA format.
                            newdata = []
                            for i in range(width * height):
                                pixel = struct.unpack(
                                    f"{self.endian}H",
                                    raw_data[(64 + (i * 2)):(66 + (i * 2))],
                                )[0]
                                blue = ((pixel >> 0) & 0xF) << 4
                                green = ((pixel >> 4) & 0xF) << 4
                                red = ((pixel >> 8) & 0xF) << 4
                                alpha = ((pixel >> 12) & 0xF) << 4
                                newdata.append(
                                    struct.pack("<BBBB", red, green, blue, alpha)
                                )
                            img = Image.frombytes(
                                'RGBA', (width, height), b''.join(newdata), 'raw', 'RGBA',
                            )
                        elif fmt == 0x20:
                            # RGBA format.
                            img = Image.frombytes(
                                'RGBA', (width, height), raw_data[64:], 'raw', 'BGRA',
                            )
                        else:
                            vprint(f"Unsupported format {hex(fmt)} for texture {name}")
                            img = None

                        self.textures.append(
                            Texture(
                                name,
                                width,
                                height,
                                fmt,
                                header_flags1,
                                header_flags2,
                                header_flags3,
                                unk1,
                                unk2,
                                unk3,
                                unk4,
                                raw_data,
                                img,
                            )
                        )

            vprint(f"Bit 0x000001 - textures; count: {length}, offset: {hex(offset)}")
            for name in texturenames:
                vprint(f"    {name}")
        else:
            vprint("Bit 0x000001 - textures; NOT PRESENT")

        # Mapping between texture index and the name of the texture.
        if feature_mask & 0x02:
            # Seems to be a structure that duplicates texture names? I am pretty
            # sure this is used to map texture names to file indexes used elsewhere.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x000002 - texturemapping; offset: {hex(offset)}")

            if offset != 0:
                self.texturemap = self.descramble_pman(offset)
                for i, name in enumerate(self.texturemap.entries):
                    vprint(f"    {i}: {name}")
        else:
            vprint("Bit 0x000002 - texturemapping; NOT PRESENT")

        if feature_mask & 0x04:
            vprint("Bit 0x000004 - legacy lz mode on")
        else:
            vprint("Bit 0x000004 - legacy lz mode off")

        # Mapping between region index and the texture it goes to as well as the
        # region of texture that this particular graphic makes up.
        if feature_mask & 0x08:
            # Mapping between individual graphics and their respective textures.
            # This is 10 bytes per entry. Seems to need both 0x2 (texture index)
            # and 0x10 (region index).
            length, offset = struct.unpack(f"{self.endian}II", self.data[header_offset:(header_offset + 8)])
            self.add_coverage(header_offset, 8)
            header_offset += 8

            if offset != 0 and length > 0:
                self.texture_to_region = [TextureRegion(0, 0, 0, 0, 0)] * length

                for i in range(length):
                    descriptor_offset = offset + (10 * i)
                    texture_no, left, top, right, bottom = struct.unpack(
                        f"{self.endian}HHHHH",
                        self.data[descriptor_offset:(descriptor_offset + 10)],
                    )
                    self.add_coverage(descriptor_offset, 10)

                    if texture_no < 0 or texture_no >= len(self.texturemap.entries):
                        raise Exception(f"Out of bounds texture {texture_no}")

                    # TODO: The offsets here seem to be off by a power of 2, there
                    # might be more flags in the above texture format that specify
                    # device scaling and such?
                    self.texture_to_region[i] = TextureRegion(texture_no, left, top, right, bottom)

            vprint(f"Bit 0x000008 - regions; count: {length}, offset: {hex(offset)}")
        else:
            vprint("Bit 0x000008 - regions; NOT PRESENT")

        if feature_mask & 0x10:
            # Names of the graphics regions, so we can look into the texture_to_region
            # mapping above.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x000010 - regionmapping; offset: {hex(offset)}")

            if offset != 0:
                self.regionmap = self.descramble_pman(offset)
                for i, name in enumerate(self.regionmap.entries):
                    vprint(f"    {i}: {name}")
        else:
            vprint("Bit 0x000010 - regionmapping; NOT PRESENT")

        if feature_mask & 0x20:
            vprint("Bit 0x000020 - text obfuscation on")
        else:
            vprint("Bit 0x000020 - text obfuscation off")

        if feature_mask & 0x40:
            # Two unknown bytes, first is a length or a count. Secound is
            # an optional offset to grab another set of bytes from.
            length, offset = struct.unpack(f"{self.endian}II", self.data[header_offset:(header_offset + 8)])
            self.add_coverage(header_offset, 8)
            header_offset += 8

            unknames = []
            if offset != 0 and length > 0:
                for i in range(length):
                    unk_offset = offset + (i * 16)
                    name_offset = struct.unpack(f"{self.endian}I", self.data[unk_offset:(unk_offset + 4)])[0]
                    self.add_coverage(unk_offset, 4)

                    # The game does some very bizarre bit-shifting. Its clear tha the first value
                    # points at a name structure, but its not in the correct endianness. This replicates
                    # the weird logic seen in game disassembly.
                    name_offset = (((name_offset >> 7) & 0x1FF) << 16) + ((name_offset >> 16) & 0xFFFF)
                    if name_offset != 0:
                        # Let's decode this until the first null.
                        bytedata = self.get_until_null(name_offset)
                        self.add_coverage(name_offset, len(bytedata) + 1, unique=False)
                        name = AFPFile.descramble_text(bytedata, self.text_obfuscated)
                        unknames.append(name)

                    self.unknown1.append(
                        Unknown1(
                            name=name,
                            data=self.data[(unk_offset + 4):(unk_offset + 16)],
                        )
                    )
                    self.add_coverage(unk_offset + 4, 12)

            vprint(f"Bit 0x000040 - unknown; count: {length}, offset: {hex(offset)}")
            for name in unknames:
                vprint(f"    {name}")
        else:
            vprint("Bit 0x000040 - unknown; NOT PRESENT")

        if feature_mask & 0x80:
            # One unknown byte, treated as an offset. This is clearly the mapping for the parsed
            # structures from 0x40, but I don't know what those are.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x000080 - unknownmapping; offset: {hex(offset)}")

            # TODO: I have no idea what this is for.
            if offset != 0:
                self.unk_pman1 = self.descramble_pman(offset)
                for i, name in enumerate(self.unk_pman1.entries):
                    vprint(f"    {i}: {name}")
        else:
            vprint("Bit 0x000080 - unknownmapping; NOT PRESENT")

        if feature_mask & 0x100:
            # Two unknown bytes, first is a length or a count. Secound is
            # an optional offset to grab another set of bytes from.
            length, offset = struct.unpack(f"{self.endian}II", self.data[header_offset:(header_offset + 8)])
            self.add_coverage(header_offset, 8)
            header_offset += 8

            if offset != 0 and length > 0:
                for i in range(length):
                    unk_offset = offset + (i * 4)
                    self.unknown2.append(
                        Unknown2(self.data[unk_offset:(unk_offset + 4)])
                    )
                    self.add_coverage(unk_offset, 4)

            vprint(f"Bit 0x000100 - unknown; count: {length}, offset: {hex(offset)}")
        else:
            vprint("Bit 0x000100 - unknown; NOT PRESENT")

        if feature_mask & 0x200:
            # One unknown byte, treated as an offset. Almost positive its a string mapping
            # for the above 0x100 structure. That's how this file format appears to work.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x000200 - unknownmapping; offset: {hex(offset)}")

            # TODO: I have no idea what this is for.
            if offset != 0:
                self.unk_pman2 = self.descramble_pman(offset)
                for i, name in enumerate(self.unk_pman2.entries):
                    vprint(f"    {i}: {name}")
        else:
            vprint("Bit 0x000200 - unknownmapping; NOT PRESENT")

        if feature_mask & 0x400:
            # One unknown byte, treated as an offset. I have no idea what this is used for,
            # it seems to be empty data in files that I've looked at, it doesn't go to any
            # structure or mapping.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x000400 - unknown; offset: {hex(offset)}")
        else:
            vprint("Bit 0x000400 - unknown; NOT PRESENT")

        if feature_mask & 0x800:
            # This is the names of the animations as far as I can tell.
            length, offset = struct.unpack(f"{self.endian}II", self.data[header_offset:(header_offset + 8)])
            self.add_coverage(header_offset, 8)
            header_offset += 8

            vprint(f"Bit 0x000800 - animations; count: {length}, offset: {hex(offset)}")

            animnames = []
            for x in range(length):
                interesting_offset = offset + (x * 12)
                if interesting_offset != 0:
                    name_offset, anim_length, anim_offset = struct.unpack(
                        f"{self.endian}III",
                        self.data[interesting_offset:(interesting_offset + 12)],
                    )
                    self.add_coverage(interesting_offset, 12)
                    if name_offset != 0:
                        # Let's decode this until the first null.
                        bytedata = self.get_until_null(name_offset)
                        self.add_coverage(name_offset, len(bytedata) + 1, unique=False)
                        name = AFPFile.descramble_text(bytedata, self.text_obfuscated)
                        animnames.append(name)

                    if anim_offset != 0:
                        self.animations.append(
                            Animation(
                                name,
                                self.data[anim_offset:(anim_offset + anim_length)]
                            )
                        )
                        self.add_coverage(anim_offset, anim_length)

            for name in animnames:
                vprint(f"    {name}")
        else:
            vprint("Bit 0x000800 - animations; NOT PRESENT")

        if feature_mask & 0x1000:
            # Seems to be a secondary structure mirroring the above.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x001000 - animationmapping; offset: {hex(offset)}")

            if offset != 0:
                self.animmap = self.descramble_pman(offset)
                for i, name in enumerate(self.animmap.entries):
                    vprint(f"    {i}: {name}")
        else:
            vprint("Bit 0x001000 - animationmapping; NOT PRESENT")

        if feature_mask & 0x2000:
            # I am making a very preliminary guess that these are shapes used along
            # with animations specified below. The names in these sections tend to
            # have the word "shape" in them.
            length, offset = struct.unpack(f"{self.endian}II", self.data[header_offset:(header_offset + 8)])
            self.add_coverage(header_offset, 8)
            header_offset += 8

            vprint(f"Bit 0x002000 - shapes; count: {length}, offset: {hex(offset)}")

            # TODO: We do a LOT of extra stuff with this one, if count > 0...

            shapenames = []
            for x in range(length):
                shape_base_offset = offset + (x * 12)
                if shape_base_offset != 0:
                    name_offset, shape_length, shape_offset = struct.unpack(
                        f"{self.endian}III",
                        self.data[shape_base_offset:(shape_base_offset + 12)],
                    )
                    self.add_coverage(shape_base_offset, 12)

                    # TODO: At the shape offset is a "D2EG" structure of some sort.
                    # I have no idea what these do. I would have to look into it
                    # more if its important.

                    if name_offset != 0:
                        # Let's decode this until the first null.
                        bytedata = self.get_until_null(name_offset)
                        self.add_coverage(name_offset, len(bytedata) + 1, unique=False)
                        name = AFPFile.descramble_text(bytedata, self.text_obfuscated)
                        shapenames.append(name)

                    if shape_offset != 0:
                        self.add_coverage(shape_offset, shape_length)
                        self.shapes.append(
                            Shape(
                                name,
                                self.data[shape_offset:(shape_offset + shape_length)],
                            )
                        )

            for name in shapenames:
                vprint(f"    {name}")
        else:
            vprint("Bit 0x002000 - shapes; NOT PRESENT")

        if feature_mask & 0x4000:
            # Seems to be a secondary section mirroring the names from above.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x004000 - shapesmapping; offset: {hex(offset)}")

            if offset != 0:
                self.shapemap = self.descramble_pman(offset)
                for i, name in enumerate(self.shapemap.entries):
                    vprint(f"    {i}: {name}")
        else:
            vprint("Bit 0x004000 - shapesmapping; NOT PRESENT")

        if feature_mask & 0x8000:
            # One unknown byte, treated as an offset. I have no idea what this is because
            # the games I've looked at don't include this bit.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            # Since I've never seen this, I'm going to assume that it showing up is
            # bad and make things read only.
            self.read_only = True

            vprint(f"Bit 0x008000 - unknown; offset: {hex(offset)}")
        else:
            vprint("Bit 0x008000 - unknown; NOT PRESENT")

        if feature_mask & 0x10000:
            # Included font package, BINXRPC encoded.
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            # I am not sure what the unknown byte is for. It always appears as
            # all zeros in all files I've looked at.
            expect_zero, length, binxrpc_offset = struct.unpack(f"{self.endian}III", self.data[offset:(offset + 12)])
            self.add_coverage(offset, 12)

            if expect_zero != 0:
                # If we find non-zero versions of this, then that means updating the file is
                # potentially unsafe as we could rewrite it incorrectly. So, let's assert!
                raise Exception("Expected a zero in font package header!")

            if binxrpc_offset != 0:
                self.fontdata = self.benc.decode(self.data[binxrpc_offset:(binxrpc_offset + length)])
                self.add_coverage(binxrpc_offset, length)
            else:
                self.fontdata = None

            vprint(f"Bit 0x010000 - fontinfo; offset: {hex(offset)}, binxrpc offset: {hex(binxrpc_offset)}")
        else:
            vprint("Bit 0x010000 - fontinfo; NOT PRESENT")

        if feature_mask & 0x20000:
            # I am beginning to suspect that this is animation/level data. I have
            # no idea what "afp" is. Games refer to these as "afp streams".
            offset = struct.unpack(f"{self.endian}I", self.data[header_offset:(header_offset + 4)])[0]
            self.add_coverage(header_offset, 4)
            header_offset += 4

            vprint(f"Bit 0x020000 - animationheaders; offset: {hex(offset)}")

            if offset > 0 and len(self.animations) > 0:
                for i in range(len(self.animations)):
                    structure_offset = offset + (i * 12)

                    # First word is always zero, as observed. I am not ENTIRELY sure that
                    # the second field is length, but it lines up with everything else
                    # I've observed and seems to make sense.
                    expect_zero, afp_header_length, afp_header = struct.unpack(
                        f"{self.endian}III",
                        self.data[structure_offset:(structure_offset + 12)]
                    )
                    self.add_coverage(structure_offset, 12)

                    if expect_zero != 0:
                        # If we find non-zero versions of this, then that means updating the file is
                        # potentially unsafe as we could rewrite it incorrectly. So, let's assert!
                        raise Exception("Expected a zero in font package header!")

                    self.animations[i].header = self.data[afp_header:(afp_header + afp_header_length)]
                    self.add_coverage(afp_header, afp_header_length)
        else:
            vprint("Bit 0x020000 - animationheaders; NOT PRESENT")

        if feature_mask & 0x40000:
            vprint("Bit 0x040000 - modern lz mode on")
        else:
            vprint("Bit 0x040000 - modern lz mode off")

        if feature_mask & 0xFFF80000:
            # We don't know these bits at all!
            raise Exception("Invalid bits set in feature mask!")

        if header_offset != header_length:
            raise Exception("Failed to parse bitfield of header correctly!")

        if verbose:
            self.print_coverage()

    @staticmethod
    def align(val: int) -> int:
        return (val + 3) & 0xFFFFFFFFC

    @staticmethod
    def pad(data: bytes, length: int) -> bytes:
        if len(data) == length:
            return data
        elif len(data) > length:
            raise Exception("Logic error, padding request in data already written!")
        return data + (b"\0" * (length - len(data)))

    def write_strings(self, data: bytes, strings: Dict[str, int]) -> bytes:
        tuples: List[Tuple[str, int]] = [(name, strings[name]) for name in strings]
        tuples = sorted(tuples, key=lambda tup: tup[1])

        for (string, offset) in tuples:
            data = AFPFile.pad(data, offset)
            data += AFPFile.scramble_text(string, self.text_obfuscated)

        return data

    def write_pman(self, data: bytes, offset: int, pman: PMAN, string_offsets: Dict[str, int]) -> bytes:
        # First, lay down the PMAN header
        if self.endian == "<":
            magic = b"PMAN"
        elif self.endian == ">":
            magic = b"NAMP"
        else:
            raise Exception("Logic error, unexpected endianness!")

        # Calculate where various data goes
        data = AFPFile.pad(data, offset)
        payload_offset = offset + 28
        string_offset = payload_offset + (len(pman.entries) * 12)
        pending_strings: Dict[str, int] = {}

        data += struct.pack(
            f"{self.endian}4sIIIIII",
            magic,
            0,
            pman.flags1,
            pman.flags2,
            len(pman.entries),
            pman.flags3,
            payload_offset,
        )

        # Now, lay down the individual entries
        for entry_no, name in enumerate(pman.entries):
            name_crc = AFPFile.crc32(name.encode('ascii'))

            if name not in string_offsets:
                # We haven't written this string out yet, so put it on our pending list.
                pending_strings[name] = string_offset
                string_offsets[name] = string_offset

                # Room for the null byte!
                string_offset += len(name) + 1

            # Write out the chunk itself.
            data += struct.pack(
                f"{self.endian}III",
                name_crc,
                entry_no,
                string_offsets[name],
            )

        # Now, put down the strings that were new in this pman structure.
        return self.write_strings(data, pending_strings)

    def unparse(self) -> bytes:
        if self.read_only:
            raise Exception("This file is read-only because we can't parse some of it!")

        # Mapping from various strings found in the file to their offsets.
        string_offsets: Dict[str, int] = {}
        pending_strings: Dict[str, int] = {}

        # The true file header, containing magic, some file flags, file length and
        # header length.
        header: bytes = b''

        # The bitfield structure that dictates what's found in the file and where.
        bitfields: bytes = b''

        # The data itself.
        body: bytes = b''

        # First, plop down the file magic as well as the unknown file flags we
        # roundtripped.
        if self.endian == "<":
            header += b"2PXT"
        elif self.endian == ">":
            header += b"TXP2"
        else:
            raise Exception("Invalid graphic file format!")

        # Not sure what words 2 and 3 are, they seem to be some sort of
        # version or date?
        header += self.data[4:12]

        # We can't plop the length down yet, since we don't know it. So, let's first
        # figure out what our bitfield length is.
        header_length = 0
        if self.features & 0x1:
            header_length += 8
        if self.features & 0x2:
            header_length += 4
        # Bit 0x4 is for lz options.
        if self.features & 0x8:
            header_length += 8
        if self.features & 0x10:
            header_length += 4
        # Bit 0x20 is for text obfuscation options.
        if self.features & 0x40:
            header_length += 8
        if self.features & 0x80:
            header_length += 4
        if self.features & 0x100:
            header_length += 8
        if self.features & 0x200:
            header_length += 4
        if self.features & 0x400:
            header_length += 4
        if self.features & 0x800:
            header_length += 8
        if self.features & 0x1000:
            header_length += 4
        if self.features & 0x2000:
            header_length += 8
        if self.features & 0x4000:
            header_length += 4
        if self.features & 0x8000:
            header_length += 4
        if self.features & 0x10000:
            header_length += 4
        if self.features & 0x20000:
            header_length += 4
        # Bit 0x40000 is for lz options.

        # We keep this indirection because we want to do our best to preserve
        # the file order we observe in actual files. So, that means writing data
        # out of order of when it shows in the header, and as such we must remember
        # what chunks go where. We key by feature bitmask so its safe to have empties.
        bitchunks = [b""] * 32

        # Pad out the body for easier calculations below
        body = AFPFile.pad(body, 24 + header_length)

        # Start laying down various file pieces.
        if self.features & 0x01:
            # List of textures that exist in the file, with pointers to their data.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # First, lay down pointers and length, regardless of number of entries.
            bitchunks[0] = struct.pack(f"{self.endian}II", len(self.textures), offset)

            for texture in self.textures:
                raise Exception("TODO!")

        if self.features & 0x08:
            # Mapping between individual graphics and their respective textures.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # First, lay down pointers and length, regardless of number of entries.
            bitchunks[3] = struct.pack(f"{self.endian}II", len(self.texture_to_region), offset)

            for tex_to_region in self.texture_to_region:
                raise Exception("TODO!")

        if self.features & 0x40:
            # Unknown file chunk.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # First, lay down pointers and length, regardless of number of entries.
            bitchunks[6] = struct.pack(f"{self.endian}II", len(self.unknown1), offset)

            # Now, calculate where we can put strings.
            string_offset = AFPFile.align(len(body) + (len(self.unknown1) * 16))

            # Now, write out chunks and strings.
            for entry1 in self.unknown1:
                if entry1.name not in string_offsets:
                    # We haven't written this string out yet, so put it on our pending list.
                    pending_strings[entry1.name] = string_offset
                    string_offsets[entry1.name] = string_offset

                    # Room for the null byte!
                    string_offset += len(entry1.name) + 1

                # Write out the chunk itself.
                body += struct.pack(f"{self.endian}I", string_offsets[entry1.name]) + entry1.data

            # Now, put down the strings that were new in this chunk.
            body = self.write_strings(body, pending_strings)
            pending_strings = {}

        if self.features & 0x100:
            # Two unknown bytes, first is a length or a count. Secound is
            # an optional offset to grab another set of bytes from.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # First, lay down pointers and length, regardless of number of entries.
            bitchunks[8] = struct.pack(f"{self.endian}II", len(self.unknown2), offset)

            # Now, write out chunks and strings.
            for entry2 in self.unknown2:
                # Write out the chunk itself.
                body += entry2.data

        if self.features & 0x400:
            # I haven't seen any files with any meaningful information for this, but
            # it gets included anyway since games seem to parse it.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Point to current data location (seems to be what original files do too).
            bitchunks[10] = struct.pack(f"{self.endian}I", offset)

        if self.features & 0x800:
            # This is the names and locations of the animations as far as I can tell.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            bitchunks[11] = struct.pack(f"{self.endian}II", len(self.animations), offset)

            # Now, calculate where we can put animations and their names.
            animation_offset = AFPFile.align(len(body) + (len(self.animations) * 12))
            string_offset = AFPFile.align(animation_offset + sum(AFPFile.align(len(a.data)) for a in self.animations))
            animdata = b""

            # Now, lay them out.
            for animation in self.animations:
                if animation.name not in string_offsets:
                    # We haven't written this string out yet, so put it on our pending list.
                    pending_strings[animation.name] = string_offset
                    string_offsets[animation.name] = string_offset

                    # Room for the null byte!
                    string_offset += len(animation.name) + 1

                # Write out the chunk itself.
                body += struct.pack(
                    f"{self.endian}III",
                    string_offsets[animation.name],
                    len(animation.data),
                    animation_offset + len(animdata),
                )
                animdata += AFPFile.pad(animation.data, AFPFile.align(len(animation.data)))

            # Now, lay out the data itself and finally string names.
            body = self.write_strings(body + animdata, pending_strings)
            pending_strings = {}

        if self.features & 0x2000:
            # This is the names and data for shapes as far as I can tell.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            bitchunks[13] = struct.pack(f"{self.endian}II", len(self.shapes), offset)

            # Now, calculate where we can put shapes and their names.
            shape_offset = AFPFile.align(len(body) + (len(self.shapes) * 12))
            string_offset = AFPFile.align(shape_offset + sum(AFPFile.align(len(s.data)) for s in self.shapes))
            shapedata = b""

            # Now, lay them out.
            for shape in self.shapes:
                if shape.name not in string_offsets:
                    # We haven't written this string out yet, so put it on our pending list.
                    pending_strings[shape.name] = string_offset
                    string_offsets[shape.name] = string_offset

                    # Room for the null byte!
                    string_offset += len(shape.name) + 1

                # Write out the chunk itself.
                body += struct.pack(
                    f"{self.endian}III",
                    string_offsets[shape.name],
                    len(shape.data),
                    shape_offset + len(shapedata),
                )
                shapedata += AFPFile.pad(shape.data, AFPFile.align(len(shape.data)))

            # Now, lay out the data itself and finally string names.
            body = self.write_strings(body + shapedata, pending_strings)
            pending_strings = {}

        if self.features & 0x8000:
            # Unknown, never seen bit. We shouldn't be here, we set ourselves
            # to read-only.
            raise Exception("This should not be possible!")

        if self.features & 0x02:
            # Mapping between texture index and the name of the texture.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Lay down PMAN pointer and PMAN structure itself.
            bitchunks[1] = struct.pack(f"{self.endian}I", offset)
            body = self.write_pman(body, offset, self.texturemap, string_offsets)

        if self.features & 0x10:
            # Names of the graphics regions, so we can look into the texture_to_region
            # mapping above.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Lay down PMAN pointer and PMAN structure itself.
            bitchunks[4] = struct.pack(f"{self.endian}I", offset)
            body = self.write_pman(body, offset, self.regionmap, string_offsets)

        if self.features & 0x80:
            # One unknown byte, treated as an offset. This is clearly the mapping for the parsed
            # structures from 0x40, but I don't know what those are.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Lay down PMAN pointer and PMAN structure itself.
            bitchunks[7] = struct.pack(f"{self.endian}I", offset)
            body = self.write_pman(body, offset, self.unk_pman1, string_offsets)

        if self.features & 0x200:
            # I am pretty sure this is a mapping for the structures parsed at 0x100.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Lay down PMAN pointer and PMAN structure itself.
            bitchunks[9] = struct.pack(f"{self.endian}I", offset)
            body = self.write_pman(body, offset, self.unk_pman2, string_offsets)

        if self.features & 0x1000:
            # Mapping of animations to their ID.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Lay down PMAN pointer and PMAN structure itself.
            bitchunks[12] = struct.pack(f"{self.endian}I", offset)
            body = self.write_pman(body, offset, self.animmap, string_offsets)

        if self.features & 0x4000:
            # Mapping of shapes to their ID.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            # Lay down PMAN pointer and PMAN structure itself.
            bitchunks[14] = struct.pack(f"{self.endian}I", offset)
            body = self.write_pman(body, offset, self.shapemap, string_offsets)

        if self.features & 0x10000:
            # Font information.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            bitchunks[16] = struct.pack(f"{self.endian}I", offset)

            # Now, encode the font information.
            fontbytes = self.benc.encode(self.fontdata)
            body += struct.pack(
                f"{self.endian}III",
                0,
                len(fontbytes),
                offset + 12,
            )
            body += fontbytes

        if self.features & 0x20000:
            # Animation header information.
            offset = AFPFile.align(len(body))
            body = AFPFile.pad(body, offset)

            bitchunks[17] = struct.pack(f"{self.endian}I", offset)

            # Now, calculate where we can put animation headers.
            animation_offset = AFPFile.align(len(body) + (len(self.animations) * 12))
            animheader = b""

            # Now, lay them out.
            for animation in self.animations:
                # Write out the chunk itself.
                body += struct.pack(
                    f"{self.endian}III",
                    0,
                    len(animation.header),
                    animation_offset + len(animheader),
                )
                animheader += AFPFile.pad(animation.header, AFPFile.align(len(animation.header)))

            # Now, lay out the header itself
            body += animheader

        # Bit 0x40000 is for lz options.

        # Now, no matter what happened above, make sure file is aligned to 4 bytes.
        offset = AFPFile.align(len(body))
        body = AFPFile.pad(body, offset)

        # Record the bitfield options into the bitfield structure, and we can
        # get started writing the file out.
        bitfields = struct.pack(f"{self.endian}I", self.features) + b"".join(bitchunks)

        # Finally, now that we know the full file length, we can finish
        # writing the header.
        header += struct.pack(f"{self.endian}II", len(body), header_length + 24)
        if len(header) != 20:
            raise Exception("Logic error, incorrect header length!")

        # Skip over padding to the body that we inserted specifically to track offsets
        # against the headers.
        return header + bitfields + body[(header_length + 24):]


def main() -> int:
    parser = argparse.ArgumentParser(description="Konami AFP graphic file unpacker/repacker")
    subparsers = parser.add_subparsers(help='Action to take', dest='action')

    extract_parser = subparsers.add_parser('extract', help='Extract relevant textures from file')
    extract_parser.add_argument(
        "file",
        metavar="FILE",
        help="The file to extract",
    )
    extract_parser.add_argument(
        "dir",
        metavar="DIR",
        help="Directory to extract to",
    )
    extract_parser.add_argument(
        "-p",
        "--pretend",
        action="store_true",
        help="Pretend to extract instead of extracting",
    )
    extract_parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Display verbuse debugging output",
    )
    extract_parser.add_argument(
        "-r",
        "--write-raw",
        action="store_true",
        help="Always write raw texture files",
    )
    extract_parser.add_argument(
        "-m",
        "--write-mappings",
        action="store_true",
        help="Write mapping files to disk",
    )

    update_parser = subparsers.add_parser('update', help='Update relevant textures in a file from a directory')
    update_parser.add_argument(
        "file",
        metavar="FILE",
        help="The file to update",
    )
    update_parser.add_argument(
        "dir",
        metavar="DIR",
        help="Directory to update from",
    )
    update_parser.add_argument(
        "-p",
        "--pretend",
        action="store_true",
        help="Pretend to update instead of updating",
    )
    update_parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Display verbuse debugging output",
    )
    args = parser.parse_args()

    if args.action == "extract":
        with open(args.file, "rb") as bfp:
            afpfile = AFPFile(bfp.read(), verbose=args.verbose)

        # Actually place the files down.
        os.makedirs(args.dir, exist_ok=True)

        for texture in afpfile.textures:
            filename = os.path.join(args.dir, texture.name)

            if texture.img:
                if args.pretend:
                    print(f"Would write {filename}.png texture...")
                else:
                    print(f"Writing {filename}.png texture...")
                    with open(f"{filename}.png", "wb") as bfp:
                        texture.img.save(bfp, format='PNG')

            if not texture.img or args.write_raw:
                if args.pretend:
                    print(f"Would write {filename}.raw texture...")
                else:
                    print(f"Writing {filename}.raw texture...")
                    with open(f"{filename}.raw", "wb") as bfp:
                        bfp.write(texture.raw)

                if args.write_mappings:
                    if args.pretend:
                        print(f"Would write {filename}.xml texture info...")
                    else:
                        print(f"Writing {filename}.xml texture info...")
                        with open(f"{filename}.xml", "w") as sfp:
                            sfp.write(textwrap.dedent(f"""
                                <info>
                                    <width>{texture.width}</width>
                                    <height>{texture.height}</height>
                                    <type>{hex(texture.fmt)}</type>
                                    <raw>{filename}.raw</raw>
                                </info>
                            """).strip())

        if args.write_mappings:
            for i, name in enumerate(afpfile.regionmap.entries):
                if i < 0 or i >= len(afpfile.texture_to_region):
                    raise Exception(f"Out of bounds region {i}")
                region = afpfile.texture_to_region[i]
                texturename = afpfile.texturemap.entries[region.textureno]
                filename = os.path.join(args.dir, name)

                if args.pretend:
                    print(f"Would write {filename}.xml region information...")
                else:
                    print(f"Writing {filename}.xml region information...")
                    with open(f"{filename}.xml", "w") as sfp:
                        sfp.write(textwrap.dedent(f"""
                            <info>
                                <left>{region.left}</left>
                                <top>{region.top}</top>
                                <right>{region.right}</right>
                                <bottom>{region.bottom}</bottom>
                                <texture>{texturename}</texture>
                            </info>
                        """).strip())

            if afpfile.fontdata is not None:
                filename = os.path.join(args.dir, "fontinfo.xml")

                if args.pretend:
                    print(f"Would write {filename} font information...")
                else:
                    print(f"Writing {filename} font information...")
                    with open(filename, "w") as sfp:
                        sfp.write(str(afpfile.fontdata))

    if args.action == "update":
        # First, parse the file out
        with open(args.file, "rb") as bfp:
            afpfile = AFPFile(bfp.read(), verbose=args.verbose)

        # Now, find any PNG files that match texture names.
        for texture in afpfile.textures:
            filename = os.path.join(args.dir, texture.name) + ".png"

            if os.path.isfile(filename):
                print(f"Updating {texture.name} from {filename}...")

                # TODO: What it says above

        # Now, write out the updated file
        if args.pretend:
            print(f"Would write {args.file}...")
            afpfile.unparse()
        else:
            print(f"Writing {args.file}...")
            with open(args.file + ".tmp", "wb") as bfp:
                bfp.write(afpfile.unparse())

    return 0


if __name__ == "__main__":
    sys.exit(main())
