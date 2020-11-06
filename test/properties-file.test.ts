import * as pf from '../src/util/properties-file'
import {Readable} from 'stream'
import {expect} from 'chai'

function mapToObject(map: Map<string, string>) {
  const obj: any = {}
  map.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}
describe('propert-file', () => {
  it('read,success', async () => {
    const stream = Readable.from('a=b\nb=c\na.b.c= def \n')
    const map = await pf.default.read(stream)
    expect(map).to.have.all.keys('a', 'b', 'a.b.c')
    const obj = mapToObject(map)
    expect(obj).to.eql({a: 'b', b: 'c', 'a.b.c': 'def'})
  })
})
