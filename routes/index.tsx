import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { AudioPlayer } from "../islands/AudioPlayer.tsx";
import { db } from "../db/db.ts";

export const handler = define.handlers({
  async GET(ctx) {
    return {
      data: await db.query.tracks.findMany(),
    };
  },
});

export default define.page<typeof handler>(({ data }) => {
  console.log(data);
  return (
    <div class="px-4 py-8 mx-auto bg-stone-200 dark:bg-stone-800 min-h-screen">
      <Head>
        <title>Fresh counter</title>
      </Head>
      <div class="max-w-3xl mx-auto flex gap-4 items-center justify-center flex-col">
        <div class="plateau w-32 h-32 rounded-lg">

        </div>
        {data.map((track) => (
          <AudioPlayer audioId={track.id} />
        ))}
      </div>
    </div>
  );
});
