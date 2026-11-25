import type { YoutubeIframeRef } from "react-native-youtube-iframe";

// Telling the YouTube player to play, pause or mute. The player component has
// two ways of reaching the page the video sits in. Its `play` and `mute`
// settings go by posted messages, which on this app's setup do not arrive: the
// buttons changed state and the video did not. Its seek command goes by
// running a script in the page, which does arrive. That script is written out
// from the two values seek is given, so the commands are sent as part of it:
//   player.seekTo(<seconds>, true); <commands>; (0); true;
// With no time given, the seek is to where the video already is.
export function tellPlayer(player: YoutubeIframeRef | null, commands: string, seconds?: number) {
  player?.seekTo(
    (seconds === undefined ? "player.getCurrentTime()" : String(Math.max(0, seconds))) as unknown as number,
    `true); ${commands}; (0` as unknown as boolean,
  );
}
