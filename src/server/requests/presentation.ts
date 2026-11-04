import type {RequestDraft} from "./validation";
import {requestDraft} from "./validation";

export const blankLine:RequestDraft["lines"][number]={commodityId:"",commodityName:"",typeId:"",specificationId:"",variety:"",quantity:"",unit:"",flexible:false,packaging:"",qualityNotes:""};
export const blankRequest:RequestDraft={deliveryState:"",deliveryCity:"",deliveryAddress:"",requiredDate:"",fulfilmentMethod:"",notes:"",lines:[blankLine]};
export type RequestRecordForForm={
 deliveryState:string|null;deliveryCity:string|null;deliveryAddress:string|null;requiredDate:Date|null;
 fulfilmentMethod:string|null;notes:string|null;draftPayload:unknown;
 lines:{commodityId:string|null;commodityName:string;typeId:string|null;specificationId:string|null;variety:string|null;quantity:{toString():string};unit:string;quantityFlexible:boolean;packaging:string|null;qualityNotes:string|null}[];
};
export function draftForForm(record:RequestRecordForForm):RequestDraft{
 const draft=requestDraft.safeParse(record.draftPayload);
 if(draft.success)return draft.data;
 return {deliveryState:record.deliveryState??"",deliveryCity:record.deliveryCity??"",deliveryAddress:record.deliveryAddress??"",
  requiredDate:record.requiredDate?.toISOString().slice(0,10)??"",fulfilmentMethod:(record.fulfilmentMethod as RequestDraft["fulfilmentMethod"])??"",
  notes:record.notes??"",lines:record.lines.length?record.lines.map(line=>({commodityId:line.commodityId??"",commodityName:line.commodityName,
   typeId:line.typeId??"",specificationId:line.specificationId??"",variety:line.variety??"",quantity:line.quantity.toString(),
   unit:line.unit as RequestDraft["lines"][number]["unit"],flexible:line.quantityFlexible,packaging:line.packaging??"",qualityNotes:line.qualityNotes??""})):[blankLine]};
}
