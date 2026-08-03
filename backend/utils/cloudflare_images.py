"""Cloudflare Workers AI를 이용한 RAG 서사 기반 아바타 장면 생성."""

import asyncio
import json
import requests

from config import settings


def configured() -> bool:
    return bool(settings.cloudflare_account_id and settings.cloudflare_api_token)


def build_visual_prompt(choice: str, narrative: str, visual_scene: dict | None = None) -> str:
    scene = json.dumps(visual_scene or {}, ensure_ascii=False, indent=2)
    return f"""
Create a rich, polished 2D editorial story illustration. Use the exact same single
main character shown in input image 0. Input image 0 is the character identity
reference, not merely a loose inspiration. Preserve the character's recognizable
face shape, eyes, eyebrows, nose, mouth, skin tone, hairstyle, hair color, glasses,
and head accessories if present. The person in the output must be immediately
recognizable as the character in input image 0.
Do NOT copy the reference image's pose, clothes, shoulders, circular frame, background,
camera angle, composition, or art style. Do not recreate a centered avatar portrait.

Future choice: {choice}
Story to visualize: {narrative}
Scene direction:
{scene}

Stage one specific, instantly understandable moment from the story. Follow the scene
direction for location, action, body pose, expression, wardrobe, camera, lighting,
foreground, background, and meaningful objects. Build a detailed, layered environment
when the story supports it. Let the character interact naturally with the environment;
vary shot distance and camera angle instead of defaulting to a front-facing desk pose.
Clean Korean mobile-app editorial illustration, expressive hand-drawn 2D look, nuanced
lighting and color, strong visual storytelling, vertical 4:5 composition.

No photorealism, no 3D render, no additional people, no text, no letters, no numbers,
no charts, no logos, no split screen, no collage.
""".strip()


def _generate_one(avatar_png, choice, narrative, visual_scene, seed):
    model = settings.cloudflare_reference_model
    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{settings.cloudflare_account_id}/ai/run/{model}"
    )
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {settings.cloudflare_api_token}"},
        data={
            "prompt": build_visual_prompt(choice, narrative, visual_scene),
            "width": str(settings.cloudflare_image_width),
            "height": str(settings.cloudflare_image_height),
            "seed": str(seed),
        },
        files={"input_image_0": ("avatar.png", avatar_png, "image/png")},
        timeout=(30, 240),
    )
    response.raise_for_status()
    payload = response.json()
    if not payload.get("success"):
        errors = "; ".join(e.get("message", "") for e in payload.get("errors", []))
        raise RuntimeError(errors or "Cloudflare image generation failed")
    image = (payload.get("result") or {}).get("image")
    if not image:
        raise RuntimeError("Cloudflare response did not contain an image")
    return f"data:image/jpeg;base64,{image}"


async def generate_pair(
    avatar_png, choice_a, choice_b, narrative_a, narrative_b,
    visual_a=None, visual_b=None,
):
    if not configured():
        raise RuntimeError("Cloudflare Workers AI is not configured")
    if not avatar_png:
        raise ValueError("Avatar image is empty")
    # The two scenes are independent. Generate them concurrently so their
    # latencies do not add up.
    # 같은 참조 이미지와 seed를 사용해 A/B의 인물 정체성과 기본 화풍을 최대한 맞춘다.
    # 장면 차이는 choice·narrative·scene prompt가 만든다.
    identity_seed = 427
    image_a, image_b = await asyncio.gather(
        asyncio.to_thread(
            _generate_one, avatar_png, choice_a, narrative_a, visual_a, identity_seed
        ),
        asyncio.to_thread(
            _generate_one, avatar_png, choice_b, narrative_b, visual_b, identity_seed
        ),
    )
    return {"a": image_a, "b": image_b}
