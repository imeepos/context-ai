export * from "./azureGpt41.action.js";
export * from "./azureGpt41Mini.action.js";
export * from "./azureGpt4o1120.action.js";
export * from "./azureGpt52Chat.action.js";
export * from "./azureGpt53Chat.action.js";
export * from "./azureGpt5Mini.action.js";
export * from "./azureGpt5Nano.action.js";
export * from "./googleVertexAiGemini25Flash.action.js";
export * from "./googleVertexAiGemini25FlashImage.action.js";
export * from "./googleVertexAiGemini25FlashLite.action.js";
export * from "./googleVertexAiGemini25Pro.action.js";
export * from "./googleVertexAiGemini31FlashImagePreview.action.js";
export * from "./googleVertexAiGemini31FlashLitePreview.action.js";
export * from "./googleVertexAiGemini31ProPreview.action.js";
export * from "./googleVertexAiGemini3ProPreview.action.js";
export * from "./googleVertexAiVeo31FastGenerate001.action.js";
export * from "./googleVertexAiVeo31Generate001.action.js";
export * from "./kieFlux2FlexImageToImage.action.js";
export * from "./kieFlux2FlexTextToImage.action.js";
export * from "./kieFlux2ProImageToImage.action.js";
export * from "./kieFlux2ProTextToImage.action.js";
export * from "./kieGoogleNanoBanana2.action.js";
export * from "./kieGptImage15ImageToImage.action.js";
export * from "./kieGptImage15TextToImage.action.js";
export * from "./kieGrokImagineImageToImage.action.js";
export * from "./kieGrokImagineImageToVideo.action.js";
export * from "./kieGrokImagineTextToImage.action.js";
export * from "./kieGrokImagineTextToVideo.action.js";
export * from "./kieHailuo23ImageToVideoPro.action.js";
export * from "./kieHailuo23ImageToVideoStandard.action.js";
export * from "./kieKling26ImageToVideo.action.js";
export * from "./kieKling26MotionControl.action.js";
export * from "./kieKling26TextToVideo.action.js";
export * from "./kieKling30.action.js";
export * from "./kieKling30Video.action.js";
export * from "./kieKlingV21MasterImageToVideo.action.js";
export * from "./kieKlingV25TurboImageToVideoPro.action.js";
export * from "./kieKlingV25TurboTextToVideoPro.action.js";
export * from "./kieMjImg2img.action.js";
export * from "./kieMjOmniReference.action.js";
export * from "./kieMjStyleReference.action.js";
export * from "./kieMjTxt2img.action.js";
export * from "./kieMjVideo.action.js";
export * from "./kieMjVideoHd.action.js";
export * from "./kieNanoBanana2.action.js";
export * from "./kieQwenTextToImage.action.js";
export * from "./kieSora2ImageToVideo.action.js";
export * from "./kieSora2ImageToVideoStable.action.js";
export * from "./kieSora2TextToVideo.action.js";
export * from "./kieSora2TextToVideoStable.action.js";
export * from "./volcengineDeepseekV32251201.action.js";
export * from "./volcengineDoubaoSeed20CodePreview260215.action.js";
export * from "./volcengineDoubaoSeed20Lite260215.action.js";
export * from "./volcengineDoubaoSeed20Mini260215.action.js";
export * from "./volcengineDoubaoSeed20Pro260215.action.js";
export * from "./volcengineDoubaoSeedance10Pro250528.action.js";
export * from "./volcengineDoubaoSeedance10ProFast251015.action.js";
export * from "./volcengineDoubaoSeedance15Pro251215.action.js";
export * from "./volcengineDoubaoSeedream40250828.action.js";
export * from "./volcengineDoubaoSeedream45251128.action.js";
export * from "./volcengineDoubaoSeedream50260128.action.js";
export * from "./volcengineDoubaoSeedream50Lite260128.action.js";
export * from "./volcengineGlm47251222.action.js";
export * from "./volcengineKimiK2Thinking251104.action.js";
export * from "./modelList.action.js";
export * from "./modelDetail.action.js";
export * from "./modelAutoRun.action.js";
export * from "./model-catalog.js";

import type { Action } from "../../tokens.js";
import { azureGpt41Action } from "./azureGpt41.action.js";
import { azureGpt41MiniAction } from "./azureGpt41Mini.action.js";
import { azureGpt4o1120Action } from "./azureGpt4o1120.action.js";
import { azureGpt52ChatAction } from "./azureGpt52Chat.action.js";
import { azureGpt53ChatAction } from "./azureGpt53Chat.action.js";
import { azureGpt5MiniAction } from "./azureGpt5Mini.action.js";
import { azureGpt5NanoAction } from "./azureGpt5Nano.action.js";
import { googleVertexAiGemini25FlashAction } from "./googleVertexAiGemini25Flash.action.js";
import { googleVertexAiGemini25FlashImageAction } from "./googleVertexAiGemini25FlashImage.action.js";
import { googleVertexAiGemini25FlashLiteAction } from "./googleVertexAiGemini25FlashLite.action.js";
import { googleVertexAiGemini25ProAction } from "./googleVertexAiGemini25Pro.action.js";
import { googleVertexAiGemini31FlashImagePreviewAction } from "./googleVertexAiGemini31FlashImagePreview.action.js";
import { googleVertexAiGemini31FlashLitePreviewAction } from "./googleVertexAiGemini31FlashLitePreview.action.js";
import { googleVertexAiGemini31ProPreviewAction } from "./googleVertexAiGemini31ProPreview.action.js";
import { googleVertexAiGemini3ProPreviewAction } from "./googleVertexAiGemini3ProPreview.action.js";
import { googleVertexAiVeo31FastGenerate001Action } from "./googleVertexAiVeo31FastGenerate001.action.js";
import { googleVertexAiVeo31Generate001Action } from "./googleVertexAiVeo31Generate001.action.js";
import { kieFlux2FlexImageToImageAction } from "./kieFlux2FlexImageToImage.action.js";
import { kieFlux2FlexTextToImageAction } from "./kieFlux2FlexTextToImage.action.js";
import { kieFlux2ProImageToImageAction } from "./kieFlux2ProImageToImage.action.js";
import { kieFlux2ProTextToImageAction } from "./kieFlux2ProTextToImage.action.js";
import { kieGoogleNanoBanana2Action } from "./kieGoogleNanoBanana2.action.js";
import { kieGptImage15ImageToImageAction } from "./kieGptImage15ImageToImage.action.js";
import { kieGptImage15TextToImageAction } from "./kieGptImage15TextToImage.action.js";
import { kieGrokImagineImageToImageAction } from "./kieGrokImagineImageToImage.action.js";
import { kieGrokImagineImageToVideoAction } from "./kieGrokImagineImageToVideo.action.js";
import { kieGrokImagineTextToImageAction } from "./kieGrokImagineTextToImage.action.js";
import { kieGrokImagineTextToVideoAction } from "./kieGrokImagineTextToVideo.action.js";
import { kieHailuo23ImageToVideoProAction } from "./kieHailuo23ImageToVideoPro.action.js";
import { kieHailuo23ImageToVideoStandardAction } from "./kieHailuo23ImageToVideoStandard.action.js";
import { kieKling26ImageToVideoAction } from "./kieKling26ImageToVideo.action.js";
import { kieKling26MotionControlAction } from "./kieKling26MotionControl.action.js";
import { kieKling26TextToVideoAction } from "./kieKling26TextToVideo.action.js";
import { kieKling30Action } from "./kieKling30.action.js";
import { kieKling30VideoAction } from "./kieKling30Video.action.js";
import { kieKlingV21MasterImageToVideoAction } from "./kieKlingV21MasterImageToVideo.action.js";
import { kieKlingV25TurboImageToVideoProAction } from "./kieKlingV25TurboImageToVideoPro.action.js";
import { kieKlingV25TurboTextToVideoProAction } from "./kieKlingV25TurboTextToVideoPro.action.js";
import { kieMjImg2imgAction } from "./kieMjImg2img.action.js";
import { kieMjOmniReferenceAction } from "./kieMjOmniReference.action.js";
import { kieMjStyleReferenceAction } from "./kieMjStyleReference.action.js";
import { kieMjTxt2imgAction } from "./kieMjTxt2img.action.js";
import { kieMjVideoAction } from "./kieMjVideo.action.js";
import { kieMjVideoHdAction } from "./kieMjVideoHd.action.js";
import { kieNanoBanana2Action } from "./kieNanoBanana2.action.js";
import { kieQwenTextToImageAction } from "./kieQwenTextToImage.action.js";
import { kieSora2ImageToVideoAction } from "./kieSora2ImageToVideo.action.js";
import { kieSora2ImageToVideoStableAction } from "./kieSora2ImageToVideoStable.action.js";
import { kieSora2TextToVideoAction } from "./kieSora2TextToVideo.action.js";
import { kieSora2TextToVideoStableAction } from "./kieSora2TextToVideoStable.action.js";
import { volcengineDeepseekV32251201Action } from "./volcengineDeepseekV32251201.action.js";
import { volcengineDoubaoSeed20CodePreview260215Action } from "./volcengineDoubaoSeed20CodePreview260215.action.js";
import { volcengineDoubaoSeed20Lite260215Action } from "./volcengineDoubaoSeed20Lite260215.action.js";
import { volcengineDoubaoSeed20Mini260215Action } from "./volcengineDoubaoSeed20Mini260215.action.js";
import { volcengineDoubaoSeed20Pro260215Action } from "./volcengineDoubaoSeed20Pro260215.action.js";
import { volcengineDoubaoSeedance10Pro250528Action } from "./volcengineDoubaoSeedance10Pro250528.action.js";
import { volcengineDoubaoSeedance10ProFast251015Action } from "./volcengineDoubaoSeedance10ProFast251015.action.js";
import { volcengineDoubaoSeedance15Pro251215Action } from "./volcengineDoubaoSeedance15Pro251215.action.js";
import { volcengineDoubaoSeedream40250828Action } from "./volcengineDoubaoSeedream40250828.action.js";
import { volcengineDoubaoSeedream45251128Action } from "./volcengineDoubaoSeedream45251128.action.js";
import { volcengineDoubaoSeedream50260128Action } from "./volcengineDoubaoSeedream50260128.action.js";
import { volcengineDoubaoSeedream50Lite260128Action } from "./volcengineDoubaoSeedream50Lite260128.action.js";
import { volcengineGlm47251222Action } from "./volcengineGlm47251222.action.js";
import { volcengineKimiK2Thinking251104Action } from "./volcengineKimiK2Thinking251104.action.js";
import { bowongModelListAction } from "./modelList.action.js";
import { bowongModelDetailAction } from "./modelDetail.action.js";
import { bowongModelAutoRunAction } from "./modelAutoRun.action.js";

export const bowongModelActions: readonly Action<any, any>[] = [
	azureGpt41Action,
	azureGpt41MiniAction,
	azureGpt4o1120Action,
	azureGpt52ChatAction,
	azureGpt53ChatAction,
	azureGpt5MiniAction,
	azureGpt5NanoAction,
	googleVertexAiGemini25FlashAction,
	googleVertexAiGemini25FlashImageAction,
	googleVertexAiGemini25FlashLiteAction,
	googleVertexAiGemini25ProAction,
	googleVertexAiGemini31FlashImagePreviewAction,
	googleVertexAiGemini31FlashLitePreviewAction,
	googleVertexAiGemini31ProPreviewAction,
	googleVertexAiGemini3ProPreviewAction,
	googleVertexAiVeo31FastGenerate001Action,
	googleVertexAiVeo31Generate001Action,
	kieFlux2FlexImageToImageAction,
	kieFlux2FlexTextToImageAction,
	kieFlux2ProImageToImageAction,
	kieFlux2ProTextToImageAction,
	kieGoogleNanoBanana2Action,
	kieGptImage15ImageToImageAction,
	kieGptImage15TextToImageAction,
	kieGrokImagineImageToImageAction,
	kieGrokImagineImageToVideoAction,
	kieGrokImagineTextToImageAction,
	kieGrokImagineTextToVideoAction,
	kieHailuo23ImageToVideoProAction,
	kieHailuo23ImageToVideoStandardAction,
	kieKling26ImageToVideoAction,
	kieKling26MotionControlAction,
	kieKling26TextToVideoAction,
	kieKling30Action,
	kieKling30VideoAction,
	kieKlingV21MasterImageToVideoAction,
	kieKlingV25TurboImageToVideoProAction,
	kieKlingV25TurboTextToVideoProAction,
	kieMjImg2imgAction,
	kieMjOmniReferenceAction,
	kieMjStyleReferenceAction,
	kieMjTxt2imgAction,
	kieMjVideoAction,
	kieMjVideoHdAction,
	kieNanoBanana2Action,
	kieQwenTextToImageAction,
	kieSora2ImageToVideoAction,
	kieSora2ImageToVideoStableAction,
	kieSora2TextToVideoAction,
	kieSora2TextToVideoStableAction,
	volcengineDeepseekV32251201Action,
	volcengineDoubaoSeed20CodePreview260215Action,
	volcengineDoubaoSeed20Lite260215Action,
	volcengineDoubaoSeed20Mini260215Action,
	volcengineDoubaoSeed20Pro260215Action,
	volcengineDoubaoSeedance10Pro250528Action,
	volcengineDoubaoSeedance10ProFast251015Action,
	volcengineDoubaoSeedance15Pro251215Action,
	volcengineDoubaoSeedream40250828Action,
	volcengineDoubaoSeedream45251128Action,
	volcengineDoubaoSeedream50260128Action,
	volcengineDoubaoSeedream50Lite260128Action,
	volcengineGlm47251222Action,
	volcengineKimiK2Thinking251104Action,
	bowongModelListAction,
	bowongModelDetailAction,
	bowongModelAutoRunAction,
];
