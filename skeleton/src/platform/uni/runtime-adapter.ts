import type {
  RuntimeFacts,
  RuntimePlatform,
  WeixinEnvironment,
} from "../../core/config/runtime-config";

export interface RuntimePort {
  facts(): RuntimeFacts;
}

const WEIXIN_ENVIRONMENTS: readonly WeixinEnvironment[] = [
  "develop",
  "trial",
  "release",
];

function isWeixinEnvironment(value: string): value is WeixinEnvironment {
  return WEIXIN_ENVIRONMENTS.includes(value as WeixinEnvironment);
}

export class UniRuntimeAdapter implements RuntimePort {
  facts(): RuntimeFacts {
    let platform: RuntimePlatform = "other";
    let weixinEnvironment: WeixinEnvironment | undefined;

    // #ifdef H5
    platform = "h5";
    // #endif

    // #ifdef MP-WEIXIN
    platform = "mp-weixin";
    const environment = uni.getAccountInfoSync().miniProgram.envVersion;
    if (isWeixinEnvironment(environment)) {
      weixinEnvironment = environment;
    }
    // #endif

    return {
      buildMode: import.meta.env.DEV ? "development" : "production",
      platform,
      ...(weixinEnvironment === undefined ? {} : { weixinEnvironment }),
    };
  }
}
