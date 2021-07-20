import { Factory } from 'typeorm-factory';
import { CnsEvent, ZnsTransaction } from '../../models';
import { randomBytes } from 'crypto';

function randomHex(
  length: number,
  options: { prefix: boolean } = { prefix: true },
): string {
  return (options.prefix ? '0x' : '') + randomBytes(length).toString('hex');
}

export const CnsEventFactory = new Factory(CnsEvent)
  .attr('type', 'Transfer')
  .sequence('blockchainId', () => `log_${randomHex(8, { prefix: false })}`)
  .sequence('transactionHash', () => randomHex(64))
  .sequence('logIndex', (i) => i - 1)
  .sequence('blockNumber', (i) => CnsEvent.InitialBlock + Math.floor(i * 1.2))
  .attr('returnValues', {});

export const ZnsTransactionFactory = new Factory(ZnsTransaction)
  .sequence('hash', () => randomHex(32))
  .sequence('atxuid', (i) => i - 1)
  .sequence(
    'blockNumber',
    (i) => ZnsTransaction.InitialBlock + Math.floor(i * 1.2),
  )
  .attr('events', []);
