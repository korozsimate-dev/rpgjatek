import { AnimationMixer, Box3, Vector3, LoopOnce } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
const loader = new GLTFLoader(),
  assets = new Map();
export async function dress(group, placeholder, role, valid) {
  try {
    if (!assets.has(role))
      assets.set(role, loader.loadAsync(`/models/${role}.glb`));
    let asset = await assets.get(role);
    if (!valid()) return;
    let model = clone(asset.scene),
      bounds = new Box3().setFromObject(model),
      height = bounds.getSize(new Vector3()).y;
    model.scale.setScalar(2.4 / height);
    model.position.y = -bounds.min.y * model.scale.y;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    group.add(model);
    placeholder.visible = false;
    let mixer = new AnimationMixer(model),
      clips = Object.fromEntries(
        asset.animations.map((a) => [a.name, mixer.clipAction(a)]),
      );
    group.userData.rig = { mixer, clips, current: null, lock: 0 };
    pose(group, "Idle", 0);
  } catch (e) {
    console.warn("Character fallback:", role, e.message);
  }
}
export function pose(group, name, dt, once = false) {
  let rig = group.userData.rig;
  if (!rig) return;
  rig.lock -= dt;
  if (rig.lock <= 0 || once) {
    let next = rig.clips[name];
    if (next && rig.current !== next) {
      rig.current?.fadeOut(0.15);
      next.reset().fadeIn(0.15).play();
      rig.current = next;
      if (once) {
        next.setLoop(LoopOnce, 1);
        rig.lock = next.getClip().duration;
      }
    }
  }
  rig.mixer.update(dt);
}
