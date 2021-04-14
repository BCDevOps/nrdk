import {test} from '@oclif/test'

describe('tool:mvn', () => {
  test
  .stdout()
  .stderr()
  .env({__SECRET_IDIR_USERPRINCIPALNAME: '-', __SECRET_IDIR_PASSWORD: '-'})
  .command(['tool:mvn', '--version'])
  .exit(0)
  .it('runs mvn --version succesfuly')
})
