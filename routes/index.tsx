import { useSignal } from "@preact/signals";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { AudioPlayer } from "../islands/AudioPlayer.tsx";

export default define.page(function Home(ctx) {
  return (
    <div class="px-4 py-8 mx-auto bg-gray-200 dark:bg-[#20232b] min-h-screen">
      <Head>
        <title>Fresh counter</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="text-4xl font-bold">Welcome to Fresh</h1>
        <p class="my-4">
          Try updating this message in the
          <code class="mx-2">./routes/index.tsx</code> file, and refresh.
        </p>
        <AudioPlayer audioId="1" />
      </div>
    </div>
  );
});
