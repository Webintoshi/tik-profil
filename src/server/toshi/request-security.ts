import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
export class ToshiBodyLimitError extends Error {}
export async function readToshiJson(request:Request,maxBytes=48_000):Promise<unknown>{
 const length=Number(request.headers.get('content-length'));
 if(Number.isFinite(length)&&length>maxBytes)throw new ToshiBodyLimitError();
 const reader=request.body?.getReader();if(!reader)throw Error('Missing body');
 const parts:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){void reader.cancel();throw new ToshiBodyLimitError();}parts.push(value);}}finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export function toshiClientFingerprint(request:Request, trustedHeader=process.env.TOSHI_TRUSTED_IP_HEADER):string{
 // Only opt in when the ingress overwrites this header and origin traffic cannot bypass it.
 const raw=trustedHeader?request.headers.get(trustedHeader)?.trim():undefined;
 const ip=raw&&isIP(raw)?raw:'shared-guest';
 return createHash('sha256').update(ip).digest('hex').slice(0,32);
}
