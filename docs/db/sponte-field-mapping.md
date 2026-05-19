# Sponte Field Mapping



Field-level import contract for the approved high-value Sponte workbooks. Raw/staging mapping is exhaustive for every source column. Normalized mapping is defined only where current confidence is good enough; everything else remains raw-only or `Needs Review`.



## MultiEmpresa.xlsx

- Sheet: `MultiEmpresa`
- Rows: `1`
- Raw table: `sponte_raw_multi_empresa`
- Primary key: `ce`
- Purpose: School / tenant metadata

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.ce` | Yes | Yes | `schools.sponte_ce` | preserve original tenant code | required | school natural key | High | Low | No | Primary source school code |
| `BairroID` | `integer-ish` | `0` | `97` | ID / FK candidate | `sponte_raw_multi_empresa.bairro_id` | Yes | Yes | `schools.source_bairro_id` | preserve source FK | optional | source bairro ref | Medium | Low | No | Needs future bairro lookup if imported |
| `Nome` | `string` | `0` | `COLÉGIO ALTA VISTA` | text / code | `sponte_raw_multi_empresa.nome` | Yes | Yes | `schools.display_name` | trim text | required | school row | High | Low | No | Primary school display name |
| `Razao` | `string` | `0` | `ASSOCIAÇÃO PEDAGÓGICA VIRTUS` | text / code | `sponte_raw_multi_empresa.razao` | Yes | Yes | `schools.legal_name` | trim text | optional | school row | High | Low | No | Legal entity name |
| `Endereco` | `string` | `0` | `Av Raja Gabáglia` | text / code | `sponte_raw_multi_empresa.endereco` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CEP` | `string` | `0` | `30.380-103` | text / code | `sponte_raw_multi_empresa.cep` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNPJ` | `string` | `0` | `41.932.335/0001-25` | text / code | `sponte_raw_multi_empresa.cnpj` | Yes | Yes | `schools.tax_id` | normalize digits to CNPJ | required | school row | High | Low | No | Canonical school tax id |
| `Inscricao` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.inscricao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Fone` | `string` | `0` | `(31) 97138-3200` | text / code | `sponte_raw_multi_empresa.fone` | Yes | Yes | `schools.phone` | normalize digits and display version | optional | school row | High | Low | No | Searchable administrative phone |
| `Fax` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.fax` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Email` | `string` | `0` | `secretaria@colegioaltavista.com.br` | text / code | `sponte_raw_multi_empresa.email` | Yes | Yes | `schools.email` | lowercase and trim | optional | school row | High | Low | No | Searchable administrative email |
| `Franquia` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.franquia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Ativo` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.ativo` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CodCliSponte` | `integer-ish` | `0` | `72776` | text / code | `sponte_raw_multi_empresa.cod_cli_sponte` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CidadeID` | `integer-ish` | `0` | `2754` | ID / FK candidate | `sponte_raw_multi_empresa.cidade_id` | Yes | Yes | `schools.source_city_id` | preserve source FK | optional | source city ref | Medium | Low | No | Needs future city lookup if imported |
| `nl` | `string` | `0` | `System.Byte[]` | text / code | `sponte_raw_multi_empresa.nl` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EntidadeMantenedora` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.entidade_mantenedora` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNPJMantenedora` | `string` | `0` | `41.932.335/0001-25` | text / code | `sponte_raw_multi_empresa.cnpj_mantenedora` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RepresentanteLegal` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.representante_legal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NRE` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.nre` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ReconhecimentoEstabelecimento` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.reconhecimento_estabelecimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FundamentacaoLegal` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.fundamentacao_legal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ParecerCEE` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.parecer_cee` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `InscricaoEstadual` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.inscricao_estadual` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Sigla` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.sigla` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `HomePage` | `string` | `0` | `https://www.colegioaltavista.com.br/` | text / code | `sponte_raw_multi_empresa.home_page` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AutorizacaoFuncionamento` | `blank` | `1` | - | date/time candidate | `sponte_raw_multi_empresa.autorizacao_funcionamento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OrganizacaoAcademica` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.organizacao_academica` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NaturezaJuridica` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.natureza_juridica` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AtoRegulatorio` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.ato_regulatorio` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EnsinoRegular` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.ensino_regular` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CodigoSEED` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.codigo_seed` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `nlProfessor` | `string` | `0` | `System.Byte[]` | integration field | `sponte_raw_multi_empresa.nl_professor` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `OptanteSimplesNacional` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.optante_simples_nacional` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroRemessaRPS` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.numero_remessa_rps` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CodigoDeArea` | `integer-ish` | `0` | `31` | text / code | `sponte_raw_multi_empresa.codigo_de_area` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `InscricaoMunicipal` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.inscricao_municipal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroEndereco` | `integer-ish` | `0` | `555` | text / code | `sponte_raw_multi_empresa.numero_endereco` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RazaoNFE` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.razao_nfe` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNPJNFE` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.cnpjnfe` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `InscricaoNFE` | `string` | `0` | `isento` | text / code | `sponte_raw_multi_empresa.inscricao_nfe` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Distribuidora` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.distribuidora` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UtilizaAnoLetivo` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.utiliza_ano_letivo` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OptanteSimplesNacionalNFe` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.optante_simples_nacional_n_fe` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PrestadorPadraoNFe` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.prestador_padrao_n_fe` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AreaAtuacaoID` | `integer-ish` | `0` | `29` | ID / FK candidate | `sponte_raw_multi_empresa.area_atuacao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EnsinoInfantil` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.ensino_infantil` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EnsinoTecnico` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.ensino_tecnico` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EnsinoSuperior` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.ensino_superior` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EnsinoProfissionalizante` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.ensino_profissionalizante` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CursoLivre` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.curso_livre` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EnsinoModular` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.ensino_modular` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ExibirConfigInicial` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.exibir_config_inicial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EscolaBilingue` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_multi_empresa.escola_bilingue` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TraducaoReconhecimentoEstabelecimento` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.traducao_reconhecimento_estabelecimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CrmID` | `blank` | `1` | - | ID / FK candidate | `sponte_raw_multi_empresa.crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `AtualizaCamposContasReceberID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_multi_empresa.atualiza_campos_contas_receber_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RestringirRelatorioViaLog` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_multi_empresa.restringir_relatorio_via_log` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NomeIngles` | `blank` | `1` | - | text / code | `sponte_raw_multi_empresa.nome_ingles` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## Alunos.xlsx

- Sheet: `Alunos`
- Rows: `760`
- Raw table: `sponte_raw_alunos`
- Primary key: `AlunoID`
- Purpose: Student master records

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `AlunoID` | `integer-ish` | `0` | `2`, `5`, `7` | ID / FK candidate | `sponte_raw_alunos.aluno_id` | Yes | Yes | `students.source_student_id` | preserve source id as bigint/text key | required | primary source key | High | Low | No | Primary student source id |
| `DestinoCorrespondenciaID` | `integer-ish` | `0` | `3`, `9`, `12` | ID / FK candidate | `sponte_raw_alunos.destino_correspondencia_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ResponsavelFinanceiroID` | `integer-ish` | `0` | `3`, `9`, `12` | ID / FK candidate | `sponte_raw_alunos.responsavel_financeiro_id` | Yes | Yes | `students.source_financial_guardian_id` | preserve source FK allow 0 as null | optional | guardian review evidence | Medium | Medium | No | Use as evidence, not family truth |
| `ResponsavelDidaticoID` | `integer-ish` | `0` | `2`, `8`, `13` | ID / FK candidate | `sponte_raw_alunos.responsavel_didatico_id` | Yes | Yes | `students.source_didactic_guardian_id` | preserve source FK allow 0 as null | optional | guardian review evidence | Medium | Medium | No | Use as evidence, not family truth |
| `BancoFebrabanID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.banco_febraban_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `BairroID` | `integer-ish` | `0` | `16`, `106`, `17` | ID / FK candidate | `sponte_raw_alunos.bairro_id` | Yes | Yes | `students.source_bairro_id` | preserve source FK | optional | source bairro ref | Medium | Low | No | Needs future bairro lookup |
| `UsuarioID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.usuario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `EstadoCivilID` | `integer-ish` | `0` | `-1`, `0`, `-2` | ID / enum candidate | `sponte_raw_alunos.estado_civil_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CidadeID` | `integer-ish` | `0` | `2754`, `3480`, `3429` | ID / FK candidate | `sponte_raw_alunos.cidade_id` | Yes | Yes | `students.source_city_id` | preserve source FK | optional | source city ref | Medium | Low | No | Needs future city lookup |
| `CidadeNatalID` | `integer-ish` | `0` | `2754`, `0`, `6962` | ID / FK candidate | `sponte_raw_alunos.cidade_natal_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Nome` | `string` | `0` | `SARAH TARTARI JUCÁ`, `SAMUEL ALEY SIQUEIRA`, `CATARINA PAOLINELLI DUTRA` | text / code | `sponte_raw_alunos.nome` | Yes | Yes | `students.full_name` | trim and preserve original casing | required | student identity | High | Low | Yes | Primary search field |
| `DataNascimento` | `date-ish string` | `3` | `4/22/2020 12:00:00 AM`, `1/28/2021 12:00:00 AM`, `11/18/2020 12:00:00 AM` | date/time candidate | `sponte_raw_alunos.data_nascimento` | Yes | Yes | `students.birth_date` | normalize Excel datetime to date | optional | student identity | High | Medium | No | Use only date portion |
| `Sexo` | `string` | `210` | `F`, `M` | text / code | `sponte_raw_alunos.sexo` | Yes | Yes | `students.gender` | map source code directly first | optional | student identity | Medium | Low | No | Needs gender normalization policy |
| `CPF` | `string` | `164` | `183.865.676-60`, `186.901.436-70`, `186.145.276-40` | text / code | `sponte_raw_alunos.cpf` | Yes | Yes | `students.cpf_digits` | strip punctuation keep digits only | optional | identity / search key | High | Medium | Yes | Searchable and dedupe relevant |
| `RG` | `string` | `640` | `24080922`, `MG-24.128.930`, `MG - 23.302.398` | text / code | `sponte_raw_alunos.rg` | Yes | Yes | `students.rg` | trim text | optional | identity | Medium | Medium | No | Brazilian document variants |
| `Endereco` | `string` | `84` | `Rua Corinto`, `Rua Cura D'Ars`, `Avenida dos Bandeirantes` | text / code | `sponte_raw_alunos.endereco` | Yes | Yes | `students.address_street` | trim text | optional | address | Medium | Low | No | Address evidence for family review |
| `CEP` | `string` | `90` | `30.220-310`, `30.431-083`, `30.310-403` | text / code | `sponte_raw_alunos.cep` | Yes | Yes | `students.postal_code` | strip punctuation keep digits and display format | optional | address / search | Medium | Low | No | Searchable postal code |
| `ComplementoEndereco` | `string` | `198` | `502`, `Apto 302`, `Apto 401` | text / code | `sponte_raw_alunos.complemento_endereco` | Yes | Yes | `students.address_complement` | trim text | optional | address | Medium | Low | No | Address evidence for family review |
| `FoneResidencial` | `string` | `230` | `(31) 9774-7257`, `(31) 99157-6059`, `(17) 99708-5342` | text / code | `sponte_raw_alunos.fone_residencial` | Yes | Yes | `students.phone_home_digits` | normalize digits only plus display version | optional | search / contact | Medium | Low | Yes | Searchable phone |
| `FoneCelular` | `string` | `219` | `(31) 98424-9098`, `(31) 99247-5526`, `(31) 98669-1992` | text / code | `sponte_raw_alunos.fone_celular` | Yes | Yes | `students.phone_mobile_digits` | normalize digits only plus display version | optional | search / contact | High | Low | Yes | Primary phone search field |
| `DataCadastro` | `date-ish string` | `0` | `12/9/2021 3:48:29 PM`, `12/9/2021 6:05:13 PM`, `12/9/2021 6:19:29 PM` | date/time candidate | `sponte_raw_alunos.data_cadastro` | Yes | Yes | `students.source_created_at` | normalize Excel datetime to timestamp | optional | audit trace | Medium | Low | No | Source creation date |
| `RamalTrabalho` | `blank` | `760` | - | text / code | `sponte_raw_alunos.ramal_trabalho` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Profissao` | `string` | `759` | `Irmão da aluna Mariana Lúcia Gomes Ferre` | text / code | `sponte_raw_alunos.profissao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Email` | `blank` | `760` | - | text / code | `sponte_raw_alunos.email` | Yes | Yes | `students.email` | lowercase and trim | optional | search / contact | Medium | Low | Yes | Most rows blank in source |
| `FoneComercial` | `string` | `754` | `(31) 3228-7126`, `(31) 3281-2948`, `(31) 3225-7199` | text / code | `sponte_raw_alunos.fone_comercial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `HorarioContato` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.horario_contato` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NaoReceberEmail` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_alunos.nao_receber_email` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Conta` | `blank` | `760` | - | text / code | `sponte_raw_alunos.conta` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Agencia` | `blank` | `760` | - | text / code | `sponte_raw_alunos.agencia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CodigoClienteBanco` | `blank` | `760` | - | text / code | `sponte_raw_alunos.codigo_cliente_banco` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EmpresaID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.empresa_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Foto` | `blank` | `760` | - | binary/blob/path field | `sponte_raw_alunos.foto` | Yes | Yes | Raw only | - | - | - | - | High | No | Binary/blob/file-path placeholder or large artifact reference; preserve raw-only |
| `TipoFoto` | `boolean-ish` | `0` | `0` | binary/blob/path field | `sponte_raw_alunos.tipo_foto` | Yes | Yes | Raw only | - | - | - | - | High | No | Binary/blob/file-path placeholder or large artifact reference; preserve raw-only |
| `MatriculaWeb` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_alunos.matricula_web` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PermEmpBib` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_alunos.perm_emp_bib` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TituloEleitor` | `blank` | `760` | - | text / code | `sponte_raw_alunos.titulo_eleitor` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DocumentoMilitar` | `blank` | `760` | - | text / code | `sponte_raw_alunos.documento_militar` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoNascimento` | `date-ish string` | `419` | `031849 01 55 2020 1 00946 095 0403477 83`, `031849 01 55 2021 1 00962 050 0408232 32`, `031849 01 55 2020 1 00958 154 0407136 41` | date/time candidate | `sponte_raw_alunos.certidao_nascimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoFolha` | `integer-ish` | `757` | `59`, `03`, `046` | text / code | `sponte_raw_alunos.certidao_folha` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoLivro` | `integer-ish` | `757` | `700040`, `1001`, `046` | text / code | `sponte_raw_alunos.certidao_livro` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoTermo` | `integer-ish` | `758` | `984`, `9650` | text / code | `sponte_raw_alunos.certidao_termo` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoDataEmissao` | `date-ish string` | `751` | `12/16/2020 12:00:00 AM`, `2/24/2022 12:00:00 AM`, `5/13/2022 12:00:00 AM` | date/time candidate | `sponte_raw_alunos.certidao_data_emissao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoCartorio` | `string` | `757` | `2º SUBDISTRITO - SP`, `3º Subsidio` | text / code | `sponte_raw_alunos.certidao_cartorio` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CertidaoUF` | `integer-ish` | `0` | `0`, `35`, `31` | boolean candidate | `sponte_raw_alunos.certidao_uf` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataExpedicaoRG` | `date-ish string` | `710` | `7/12/2019 12:00:00 AM`, `7/7/2022 12:00:00 AM`, `12/3/2018 12:00:00 AM` | date/time candidate | `sponte_raw_alunos.data_expedicao_rg` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OrgaoExpedidorRG` | `string` | `711` | `PCMG`, `SSP`, `SSP MG` | text / code | `sponte_raw_alunos.orgao_expedidor_rg` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Idade` | `integer-ish` | `0` | `6`, `5`, `2` | text / code | `sponte_raw_alunos.idade` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Alergia` | `string` | `557` | `NÃO`, `PICADA DE INSETO`, `MOFO POEIRA - INTOLERÂNCIA MOFO POEIRA` | text / code | `sponte_raw_alunos.alergia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Doencas` | `string` | `576` | `NÃO`, `ASMA`, `---` | text / code | `sponte_raw_alunos.doencas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PrimeirosSocorros` | `string` | `567` | `NÃO`, `---`, `--` | integration field | `sponte_raw_alunos.primeiros_socorros` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `TipoSanguineo` | `blank` | `760` | - | text / code | `sponte_raw_alunos.tipo_sanguineo` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Cor` | `integer-ish` | `0` | `1`, `0`, `3` | text / code | `sponte_raw_alunos.cor` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PreEmOutra` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos.pre_em_outra` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoCertidao` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos.tipo_certidao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroMatriculaCertidao` | `integer-ish` | `752` | `11527901552022100275119015836242`, `03311801552021101213053058147022`, `03184901552021100970243243041082548` | text / code | `sponte_raw_alunos.numero_matricula_certidao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TituloEleitorZona` | `blank` | `760` | - | text / code | `sponte_raw_alunos.titulo_eleitor_zona` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TituloEleitorSessao` | `blank` | `760` | - | text / code | `sponte_raw_alunos.titulo_eleitor_sessao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TituloEleitorDataEmissao` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.titulo_eleitor_data_emissao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NaoReceberSMS` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_alunos.nao_receber_sms` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NroDocMilitar` | `blank` | `760` | - | text / code | `sponte_raw_alunos.nro_doc_militar` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CidadeCertidaoID` | `integer-ish` | `0` | `0`, `9640`, `9668` | ID / FK candidate | `sponte_raw_alunos.cidade_certidao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TurnoPretendido` | `string` | `720` | `Tarde`, `Manhã`, `Manhã/Tarde` | text / code | `sponte_raw_alunos.turno_pretendido` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNHOrgEmissor` | `blank` | `760` | - | integration field | `sponte_raw_alunos.cnh_org_emissor` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `CNHDataVencimento` | `date-ish string` | `0` | `1/1/1900 12:00:00 AM` | date/time candidate | `sponte_raw_alunos.cnh_data_vencimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNHUFID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.cnhufid` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNHCategoria` | `blank` | `760` | - | text / code | `sponte_raw_alunos.cnh_categoria` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNHNumero` | `blank` | `760` | - | text / code | `sponte_raw_alunos.cnh_numero` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNHRegistro` | `blank` | `760` | - | text / code | `sponte_raw_alunos.cnh_registro` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `HorarioEntrada` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.horario_entrada` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `HorarioSaida` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.horario_saida` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OperadoraCelularId` | `integer-ish` | `0` | `0`, `3`, `4` | ID / FK candidate | `sponte_raw_alunos.operadora_celular_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MelhorHorarioContatoID` | `date-ish string` | `0` | `0`, `1`, `3` | ID / FK candidate | `sponte_raw_alunos.melhor_horario_contato_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NroPassaporte` | `string` | `759` | `YE065112` | text / code | `sponte_raw_alunos.nro_passaporte` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LocalTrabalho` | `blank` | `760` | - | text / code | `sponte_raw_alunos.local_trabalho` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DiaVencimento` | `date-ish string` | `0` | `0`, `10` | boolean candidate | `sponte_raw_alunos.dia_vencimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FotoPortal` | `blank` | `760` | - | binary/blob/path field | `sponte_raw_alunos.foto_portal` | Yes | Yes | Raw only | - | - | - | - | High | No | Binary/blob/file-path placeholder or large artifact reference; preserve raw-only |
| `CorPortal` | `blank` | `760` | - | text / code | `sponte_raw_alunos.cor_portal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroEndereco` | `string` | `84` | `471`, `1318`, `1297` | text / code | `sponte_raw_alunos.numero_endereco` | Yes | Yes | `students.address_number` | trim text | optional | address | Medium | Low | No | Address evidence for family review |
| `DataArquivo` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.data_arquivo` | Yes | Yes | `students.source_archive_date` | normalize Excel datetime to timestamp | optional | archive trace | Low | Medium | No | Needs Review for actual business meaning |
| `NroPastaArquivo` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.nro_pasta_arquivo` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LocalizacaoArquivo` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos.localizacao_arquivo` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OutraEscolaId` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.outra_escola_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NomeSocial` | `boolean-ish` | `712` | `1` | boolean candidate | `sponte_raw_alunos.nome_social` | Yes | Yes | `students.social_name` | trim text | optional | student identity | High | Low | Yes | Secondary search field |
| `RecordValue` | `integer-ish` | `0` | `8`, `11`, `12` | text / code | `sponte_raw_alunos.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `NaoReceberSMSMarketing` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos.nao_receber_sms_marketing` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CondutorID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.condutor_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ResponsavelFinanceiroOpcionalID` | `integer-ish` | `0` | `0`, `8`, `16` | ID / FK candidate | `sponte_raw_alunos.responsavel_financeiro_opcional_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CondutorSaidaID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos.condutor_saida_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NacionalidadeID` | `boolean-ish` | `0` | `1`, `0` | ID / FK candidate | `sponte_raw_alunos.nacionalidade_id` | Yes | Yes | `students.source_nationality_id` | preserve source FK | optional | source lookup | Low | Medium | No | Needs Review |
| `InfoBloqueada` | `blank` | `760` | - | text / code | `sponte_raw_alunos.info_bloqueada` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ClienteStoneID` | `integer-ish` | `0` | `0`, `502723`, `1401130` | ID / FK candidate | `sponte_raw_alunos.cliente_stone_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `PaisID` | `integer-ish` | `0` | `0`, `172` | ID / FK candidate | `sponte_raw_alunos.pais_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Estrangeiro` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_alunos.estrangeiro` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CrmID` | `blank` | `760` | - | ID / FK candidate | `sponte_raw_alunos.crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `LexID` | `blank` | `760` | - | ID / FK candidate | `sponte_raw_alunos.lex_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ContatoWhats` | `integer-ish` | `27` | `0`, `-3`, `-1` | text / code | `sponte_raw_alunos.contato_whats` | Yes | Yes | `students.has_whatsapp_contact` | cast 0/1 to boolean | optional | search / contact | Medium | Low | No | Useful contact hint |
| `Desativado` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_alunos.desativado` | Yes | Yes | `students.source_disabled` | cast 0/1 to boolean | optional | status | Medium | Low | No | Do not derive operational status only from this |
| `BloquearRematricula` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos.bloquear_rematricula` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `GeneroID` | `integer-ish` | `0` | `1`, `2`, `0` | ID / FK candidate | `sponte_raw_alunos.genero_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `InscricaoMunicipal` | `blank` | `760` | - | text / code | `sponte_raw_alunos.inscricao_municipal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FotoS3Path` | `boolean-ish` | `0` | `0` | binary/blob/path field | `sponte_raw_alunos.foto_s3_path` | Yes | Yes | Raw only | - | - | - | - | High | No | Binary/blob/file-path placeholder or large artifact reference; preserve raw-only |
| `HabilitaBoletoSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_alunos.habilita_boleto_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaPixSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_alunos.habilita_pix_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaCreditoSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_alunos.habilita_credito_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaRecorrenciaSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_alunos.habilita_recorrencia_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `NumeroMaximoParcelasSpontePay2` | `integer-ish` | `0` | `12` | integration field | `sponte_raw_alunos.numero_maximo_parcelas_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |

## Responsaveis.xlsx

- Sheet: `Responsaveis`
- Rows: `915`
- Raw table: `sponte_raw_responsaveis`
- Primary key: `ResponsavelID`
- Purpose: Guardian / responsible master records

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ResponsavelID` | `integer-ish` | `0` | `2`, `5`, `7` | ID / FK candidate | `sponte_raw_responsaveis.responsavel_id` | Yes | Yes | `guardians.source_guardian_id` | preserve source id as bigint/text key | required | primary source key | High | Low | No | Primary guardian source id |
| `CidadeID` | `integer-ish` | `0` | `2754`, `3480`, `2980` | ID / FK candidate | `sponte_raw_responsaveis.cidade_id` | Yes | Yes | `guardians.source_city_id` | preserve source FK | optional | source city ref | Medium | Low | No | Needs future city lookup |
| `BairroID` | `integer-ish` | `0` | `16`, `13`, `25` | ID / FK candidate | `sponte_raw_responsaveis.bairro_id` | Yes | Yes | `guardians.source_bairro_id` | preserve source FK | optional | source bairro ref | Medium | Low | No | Needs future bairro lookup |
| `Nome` | `string` | `0` | `Taleia Alana Tartari Jucá`, `Alessandra Lessa Penna Cavaliere Borges`, `Bruno Fioravante Andreata` | text / code | `sponte_raw_responsaveis.nome` | Yes | Yes | `guardians.full_name` | trim and preserve original casing | required | guardian identity | High | Low | Yes | Primary search field |
| `Endereco` | `string` | `133` | `Rua Corinto`, `Rua Assunção`, `Rua Stella Camargos` | text / code | `sponte_raw_responsaveis.endereco` | Yes | Yes | `guardians.address_street` | trim text | optional | address | Medium | Low | No | Family review evidence |
| `CEP` | `string` | `133` | `30.220-310`, `30.320-020`, `30.520-300` | text / code | `sponte_raw_responsaveis.cep` | Yes | Yes | `guardians.postal_code` | strip punctuation keep digits and display format | optional | search / address | Medium | Low | No | Searchable postal code |
| `FoneResidencial` | `string` | `218` | `(31) 9338-8207`, `(31) 9959-5180`, `(31) 9924-7552` | text / code | `sponte_raw_responsaveis.fone_residencial` | Yes | Yes | `guardians.phone_home_digits` | normalize digits only plus display version | optional | search / contact | Medium | Low | Yes | Searchable phone |
| `FoneCelular` | `string` | `73` | `(31) 99338-8207`, `(31) 99595-1804`, `(31) 98417-9096` | text / code | `sponte_raw_responsaveis.fone_celular` | Yes | Yes | `guardians.phone_mobile_digits` | normalize digits only plus display version | optional | search / contact | High | Low | Yes | Primary phone search field |
| `Email` | `string` | `767` | `juronacher@yahoo.com.br`, `ferreira.cleberson@gmail.com`, `annammachado@gmail.com` | text / code | `sponte_raw_responsaveis.email` | Yes | Yes | `guardians.email` | lowercase and trim | optional | search / contact | High | Low | Yes | Searchable email |
| `FoneComercial` | `string` | `893` | `(31) 3228-7126`, `(31) 3281-2948`, `(31) 2101-6364` | text / code | `sponte_raw_responsaveis.fone_comercial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Profissao` | `string` | `776` | `Psicóloga`, `Médica`, `Empresário` | text / code | `sponte_raw_responsaveis.profissao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Observacao` | `string` | `912` | `Olá! 
Gostaria de formalizar por aqui no`, `Professor do Colégio.`, `URGÊNCIA: Cristiana Couto Miguel, madrin` | text / code | `sponte_raw_responsaveis.observacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataNascimento` | `date-ish string` | `157` | `4/30/1992 12:00:00 AM`, `4/18/1992 12:00:00 AM`, `6/2/1986 12:00:00 AM` | date/time candidate | `sponte_raw_responsaveis.data_nascimento` | Yes | Yes | `guardians.birth_date` | normalize Excel datetime to date | optional | guardian identity | High | Medium | No | Use only date portion |
| `CPF` | `string` | `57` | `087.699.086-30`, `109.309.276-99`, `069.372.216-90` | text / code | `sponte_raw_responsaveis.cpf` | Yes | Yes | `guardians.cpf_digits` | strip punctuation keep digits only | optional | identity / search key | High | Medium | Yes | Searchable and dedupe relevant |
| `RG` | `string` | `426` | `13336686`, `13384921`, `13804571` | text / code | `sponte_raw_responsaveis.rg` | Yes | Yes | `guardians.rg` | trim text | optional | identity | Medium | Medium | No | Brazilian document variants |
| `ComplementoEndereco` | `string` | `328` | `APT. 502`, `Ap. 801`, `Apto 3102` | text / code | `sponte_raw_responsaveis.complemento_endereco` | Yes | Yes | `guardians.address_complement` | trim text | optional | address | Medium | Low | No | Family review evidence |
| `LoginSponteNet` | `integer-ish` | `52` | `08769908630`, `10930927699`, `06937221690` | text / code | `sponte_raw_responsaveis.login_sponte_net` | Yes | Yes | `guardians.legacy_portal_login_reference` | preserve only if policy approves otherwise raw-only | optional | legacy reference | Low | High | No | Prefer raw-only; Needs Review |
| `SenhaSponteNet` | `string` | `52` | `08769908630`, `10930927699`, `06937221690` | text / code | `sponte_raw_responsaveis.senha_sponte_net` | Yes | Yes | Raw only | - | - | - | - | High | No | Legacy password or secret material; never promote to app layer |
| `EstadoCivilID` | `integer-ish` | `0` | `-2`, `0`, `-4` | ID / enum candidate | `sponte_raw_responsaveis.estado_civil_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LocalTrabalho` | `string` | `902` | `Funcionário Publico da CODEMGE`, `Hospital Mater Dei`, `manoellfandrade@gmail.com` | text / code | `sponte_raw_responsaveis.local_trabalho` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Naturalidade` | `integer-ish` | `0` | `0`, `2754`, `3047` | text / code | `sponte_raw_responsaveis.naturalidade` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `GrauInstrucaoId` | `integer-ish` | `0` | `8`, `10`, `0` | ID / FK candidate | `sponte_raw_responsaveis.grau_instrucao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataExpedicaoRG` | `date-ish string` | `730` | `11/24/2024 12:00:00 AM`, `7/13/2016 12:00:00 AM`, `11/27/2019 12:00:00 AM` | date/time candidate | `sponte_raw_responsaveis.data_expedicao_rg` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OrgaoExpedidorRG` | `string` | `534` | `MG`, `OAB`, `SSP/SE` | text / code | `sponte_raw_responsaveis.orgao_expedidor_rg` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Sexo` | `string` | `310` | `F`, `M` | text / code | `sponte_raw_responsaveis.sexo` | Yes | Yes | `guardians.gender` | map source code directly first | optional | guardian identity | Medium | Low | No | Needs gender normalization policy |
| `Ce` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_responsaveis.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `OperadoraCelularId` | `boolean-ish` | `0` | `0`, `4` | ID / FK candidate | `sponte_raw_responsaveis.operadora_celular_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FotoPortal` | `string` | `856` | `System.Byte[]` | binary/blob/path field | `sponte_raw_responsaveis.foto_portal` | Yes | Yes | Raw only | - | - | - | - | High | No | Binary/blob/file-path placeholder or large artifact reference; preserve raw-only |
| `CorPortal` | `string` | `914` | `#C67BA5` | text / code | `sponte_raw_responsaveis.cor_portal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroEndereco` | `string` | `133` | `471`, `425`, `343` | text / code | `sponte_raw_responsaveis.numero_endereco` | Yes | Yes | `guardians.address_number` | trim text | optional | address | Medium | Low | No | Family review evidence |
| `TipoResp` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_responsaveis.tipo_resp` | Yes | Yes | `guardians.source_guardian_role_text` | trim text | optional | legacy role text | Low | Medium | No | Needs Review against TipoResponsavelID link model |
| `CodigoBarras` | `integer-ish` | `0` | `2`, `5`, `7` | text / code | `sponte_raw_responsaveis.codigo_barras` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NomeSocial` | `boolean-ish` | `892` | `1` | boolean candidate | `sponte_raw_responsaveis.nome_social` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NaoReceberEmail` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_responsaveis.nao_receber_email` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NaoReceberSMS` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_responsaveis.nao_receber_sms` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecordValue` | `integer-ish` | `0` | `8`, `12`, `3` | text / code | `sponte_raw_responsaveis.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `NaoReceberSMSMarketing` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_responsaveis.nao_receber_sms_marketing` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ClienteStoneID` | `integer-ish` | `0` | `0`, `718669`, `603686` | ID / FK candidate | `sponte_raw_responsaveis.cliente_stone_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `PaisID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_responsaveis.pais_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NroPassaporte` | `blank` | `915` | - | text / code | `sponte_raw_responsaveis.nro_passaporte` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Estrangeiro` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_responsaveis.estrangeiro` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsaAppAgendaPlus` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_responsaveis.usa_app_agenda_plus` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UltimoRetornoAgendaPlus` | `string` | `910` | `Já existe outro usuário cadastrado com e` | text / code | `sponte_raw_responsaveis.ultimo_retorno_agenda_plus` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UltimoAcessoAgendaPlus` | `string` | `555` | `8/8/2025 12:46:57 PM`, `8/18/2025 10:10:29 PM`, `6/24/2025 8:01:43 PM` | integration field | `sponte_raw_responsaveis.ultimo_acesso_agenda_plus` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `CrmID` | `blank` | `915` | - | ID / FK candidate | `sponte_raw_responsaveis.crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `LexID` | `blank` | `915` | - | ID / FK candidate | `sponte_raw_responsaveis.lex_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ContatoWhats` | `integer-ish` | `118` | `-1`, `0`, `-3` | text / code | `sponte_raw_responsaveis.contato_whats` | Yes | Yes | `guardians.has_whatsapp_contact` | cast 0/1 to boolean | optional | search / contact | Medium | Low | No | Useful contact hint |
| `AlunoIDResponsavel` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_responsaveis.aluno_id_responsavel` | Yes | Yes | `guardians.source_single_student_hint_id` | preserve source FK | optional | legacy relationship hint | Low | Medium | No | Do not use as canonical relation |
| `GeneroID` | `integer-ish` | `0` | `1`, `2`, `0` | ID / FK candidate | `sponte_raw_responsaveis.genero_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NacionalidadeID` | `boolean-ish` | `0` | `0`, `1` | ID / FK candidate | `sponte_raw_responsaveis.nacionalidade_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `QtdIgnorarSenha` | `integer-ish` | `0` | `0`, `2`, `1` | text / code | `sponte_raw_responsaveis.qtd_ignorar_senha` | Yes | Yes | Raw only | - | - | - | - | High | No | Legacy password or secret material; never promote to app layer |
| `TentativasAcesso` | `integer-ish` | `0` | `0`, `2`, `1` | integration field | `sponte_raw_responsaveis.tentativas_acesso` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `InscricaoMunicipal` | `blank` | `915` | - | text / code | `sponte_raw_responsaveis.inscricao_municipal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SimplesNacional` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_responsaveis.simples_nacional` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## AlunosResponsaveis.xlsx

- Sheet: `AlunosResponsaveis`
- Rows: `1264`
- Raw table: `sponte_raw_alunos_responsaveis`
- Primary key: `AlunoResponsavelID`
- Purpose: Student-guardian relationship graph

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `AlunoResponsavelID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_alunos_responsaveis.aluno_responsavel_id` | Yes | Yes | `student_guardians.source_link_id` | preserve source id | required | primary source key | High | Low | No | Primary relation key |
| `ResponsavelID` | `integer-ish` | `0` | `2`, `3`, `5` | ID / FK candidate | `sponte_raw_alunos_responsaveis.responsavel_id` | Yes | Yes | `student_guardians.guardian_id` | join to guardians.source_guardian_id | required | FK guardians.source_guardian_id | High | Low | No | Canonical relation edge |
| `AlunoID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_alunos_responsaveis.aluno_id` | Yes | Yes | `student_guardians.student_id` | join to students.source_student_id | required | FK students.source_student_id | High | Low | No | Canonical relation edge |
| `TipoResponsavelID` | `integer-ish` | `0` | `-2`, `-1`, `4` | ID / enum candidate | `sponte_raw_alunos_responsaveis.tipo_responsavel_id` | Yes | Yes | `student_guardians.relationship_type` | decode via TiposResponsaveis and store code + label | required | lookup TiposResponsaveis.xlsx | High | Low | No | Family derivation anchor |
| `PodeRetirarAluno` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_alunos_responsaveis.pode_retirar_aluno` | Yes | Yes | `student_guardians.can_pickup` | cast 0/1 to boolean | optional | relation capability | High | Low | No | Checkout / pickup relevant |
| `RecordValue` | `integer-ish` | `0` | `1`, `2`, `3` | boolean candidate | `sponte_raw_alunos_responsaveis.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `PodeAcessarPortal` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_alunos_responsaveis.pode_acessar_portal` | Yes | Yes | `student_guardians.can_access_portal` | cast 0/1 to boolean | optional | relation capability | Medium | Medium | No | Legacy portal access hint |

## AlunosResponsaveisRetirada.xlsx

- Sheet: `AlunosResponsaveisRetirada`
- Rows: `10`
- Raw table: `sponte_raw_alunos_responsaveis_retirada`
- Primary key: `AlunoResponsavelRetiradaID`
- Purpose: Guardian pickup schedule restrictions

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `AlunoResponsavelRetiradaID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_alunos_responsaveis_retirada.aluno_responsavel_retirada_id` | Yes | Yes | `guardian_pickup_permissions.source_pickup_rule_id` | preserve source id | required | primary source key | High | Low | No | Primary rule key |
| `AlunoResponsavelID` | `integer-ish` | `0` | `14380`, `14381` | ID / FK candidate | `sponte_raw_alunos_responsaveis_retirada.aluno_responsavel_id` | Yes | Yes | `guardian_pickup_permissions.student_guardian_link_id` | join to student_guardians.source_link_id | required | FK student_guardians.source_link_id | High | Low | No | Rule owner |
| `DiaRetirada` | `integer-ish` | `0` | `1`, `2`, `3` | text / code | `sponte_raw_alunos_responsaveis_retirada.dia_retirada` | Yes | Yes | `guardian_pickup_permissions.weekday_code` | preserve numeric code and derive weekday label later | optional | pickup schedule | Medium | Medium | No | Needs weekday decoding rule |
| `Horario` | `date-ish string` | `0` | `1/1/1900 12:00:00 AM` | date/time candidate | `sponte_raw_alunos_responsaveis_retirada.horario` | Yes | Yes | `guardian_pickup_permissions.allowed_time` | normalize Excel time if valid | optional | pickup schedule | Low | Medium | No | Many placeholder 1900 time values |

## RetiradaAlunosAPP.xlsx

- Sheet: `RetiradaAlunosAPP`
- Rows: `37`
- Raw table: `sponte_raw_retirada_alunos_app`
- Primary key: `RetiradaAlunoID`
- Purpose: Guardian pickup app events

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `RetiradaAlunoID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_retirada_alunos_app.retirada_aluno_id` | Yes | Yes | `guardian_pickup_events.source_pickup_event_id` | preserve source id | required | primary source key | High | Low | No | Primary event key |
| `AlunoID` | `integer-ish` | `0` | `211`, `485`, `492` | ID / FK candidate | `sponte_raw_retirada_alunos_app.aluno_id` | Yes | Yes | `guardian_pickup_events.student_id` | join to students.source_student_id | required | FK students.source_student_id | High | Low | No | Pickup event student |
| `ResponsavelID` | `integer-ish` | `0` | `317`, `599`, `613` | ID / FK candidate | `sponte_raw_retirada_alunos_app.responsavel_id` | Yes | Yes | `guardian_pickup_events.guardian_id` | join to guardians.source_guardian_id | required | FK guardians.source_guardian_id | High | Low | No | Pickup event guardian |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_retirada_alunos_app.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `DataHora` | `date-ish string` | `0` | `1/14/2025 4:00:00 PM`, `2/11/2025 5:00:02 PM`, `2/13/2025 11:30:56 AM` | date/time candidate | `sponte_raw_retirada_alunos_app.data_hora` | Yes | Yes | `guardian_pickup_events.event_at` | normalize Excel datetime to timestamp | required | event timestamp | High | Low | No | Operational history |
| `Retirou` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_retirada_alunos_app.retirou` | Yes | Yes | `guardian_pickup_events.completed` | cast 0/1 to boolean | optional | pickup completion flag | Medium | Medium | No | Needs exact business meaning review |
| `Motivo` | `string` | `0` | `Teste`, `Trabalho`, `Médico` | text / code | `sponte_raw_retirada_alunos_app.motivo` | Yes | Yes | `guardian_pickup_events.note` | trim text | optional | event note | High | Low | No | Operational context |

## AlunosEmpresas.xlsx

- Sheet: `AlunosEmpresas`
- Rows: `760`
- Raw table: `sponte_raw_alunos_empresas`
- Primary key: `AlunoEmpresaID`
- Purpose: Student institutional status / matrícula overlay

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `AlunoEmpresaID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_alunos_empresas.aluno_empresa_id` | Yes | Yes | `students.source_student_school_id` | preserve source id | required | student school overlay key | High | Low | No | One row per student in this export |
| `AlunoID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_alunos_empresas.aluno_id` | Yes | Yes | `students.source_student_id` | join/update by source student id | required | FK students.source_student_id | High | Low | No | Overlay join key |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_alunos_empresas.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `BolsaID` | `boolean-ish` | `0` | `0`, `13` | ID / FK candidate | `sponte_raw_alunos_empresas.bolsa_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MotivoNaoFechamentoID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos_empresas.motivo_nao_fechamento_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SituacaoAlunoID` | `integer-ish` | `0` | `-1`, `-2`, `-5` | ID / enum candidate | `sponte_raw_alunos_empresas.situacao_aluno_id` | Yes | Yes | `students.current_status` | decode via SituacoesAlunos and store code + label | required | lookup SituacoesAlunos.xlsx | High | Low | Yes | Primary student status |
| `MidiaID` | `integer-ish` | `0` | `0`, `2`, `8` | ID / FK candidate | `sponte_raw_alunos_empresas.midia_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoContatoID` | `boolean-ish` | `0` | `0`, `1`, `-2` | ID / FK candidate | `sponte_raw_alunos_empresas.tipo_contato_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoCursoID` | `integer-ish` | `0` | `0`, `-2`, `-1` | ID / FK candidate | `sponte_raw_alunos_empresas.tipo_curso_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CursoID` | `string` | `0` | `;`, `;3;`, `;9;` | ID / FK candidate | `sponte_raw_alunos_empresas.curso_id` | Yes | Yes | `students.source_course_tokens` | preserve raw semicolon-delimited values; derive separate links later | optional | course hint | Low | High | No | Needs Review: denormalized field |
| `TipoContratoID` | `boolean-ish` | `0` | `0` | ID / enum candidate | `sponte_raw_alunos_empresas.tipo_contrato_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FuncionarioID` | `integer-ish` | `0` | `0`, `141`, `128` | ID / FK candidate | `sponte_raw_alunos_empresas.funcionario_id` | Yes | Yes | `students.source_staff_owner_id` | preserve source FK | optional | legacy staff association | Low | Medium | No | Needs Review |
| `DataInclusao` | `date-ish string` | `0` | `12/9/2021 3:48:29 PM`, `12/9/2021 5:47:14 PM`, `12/9/2021 5:59:23 PM` | date/time candidate | `sponte_raw_alunos_empresas.data_inclusao` | Yes | Yes | `students.source_enrollment_created_at` | normalize Excel datetime to timestamp | optional | timeline | Medium | Low | No | Historical creation date |
| `NumeroMatricula` | `integer-ish` | `65` | `1`, `2`, `3` | text / code | `sponte_raw_alunos_empresas.numero_matricula` | Yes | Yes | `students.enrollment_number` | trim text preserve leading zeros | optional | search / enrollment key | High | Low | Yes | Important search field |
| `SenhaSponteNet` | `string` | `63` | `Sarah#2204`, `2`, `3` | text / code | `sponte_raw_alunos_empresas.senha_sponte_net` | Yes | Yes | Raw only | - | - | - | - | High | No | Legacy password or secret material; never promote to app layer |
| `Inadimplente` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_alunos_empresas.inadimplente` | Yes | Yes | `students.financial_flag` | cast 0/1 to boolean | optional | financial hint | Medium | Low | No | Use as hint only, not full truth |
| `Observacao` | `string` | `307` | `NÃO`, `ASMA
PICADA DE INSETO`, `GARGANTA INFLAMADA
INFECÇÃO DE OUVIDO
SI` | text / code | `sponte_raw_alunos_empresas.observacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RA` | `string` | `377` | `00:00:00` | text / code | `sponte_raw_alunos_empresas.ra` | Yes | Yes | `students.academic_registry` | trim text preserve leading zeros | optional | search / enrollment key | High | Low | Yes | Important search field |
| `ProcessoSeletivoInstituicao` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.processo_seletivo_instituicao` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ProcessoSeletivoAnoIngresso` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.processo_seletivo_ano_ingresso` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ProcessoSeletivoFormaIngresso` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.processo_seletivo_forma_ingresso` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ProcessoSeletivoNotaProva` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.processo_seletivo_nota_prova` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ProcessoSeletivoNotaRedacao` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.processo_seletivo_nota_redacao` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `ProcessoSeletivoMedia` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.processo_seletivo_media` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `TurmaInteresseId` | `integer-ish` | `0` | `0`, `51`, `44` | ID / FK candidate | `sponte_raw_alunos_empresas.turma_interesse_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CodigoBarras` | `integer-ish` | `0` | `30190904`, `2`, `3` | text / code | `sponte_raw_alunos_empresas.codigo_barras` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LoginSponteNet` | `integer-ish` | `63` | `1`, `2`, `3` | text / code | `sponte_raw_alunos_empresas.login_sponte_net` | Yes | Yes | `students.legacy_portal_login_reference` | prefer raw-only | optional | legacy auth | Low | High | No | Should remain raw-only unless explicitly needed |
| `PromotorID` | `integer-ish` | `0` | `0`, `128`, `7` | ID / FK candidate | `sponte_raw_alunos_empresas.promotor_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OrigemId` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos_empresas.origem_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoClassificacaoID` | `integer-ish` | `0` | `0`, `2`, `5` | ID / FK candidate | `sponte_raw_alunos_empresas.tipo_classificacao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AlunoEvoluaID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_alunos_empresas.aluno_evolua_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Temperatura` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos_empresas.temperatura` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `BloquearRematriculaWeb` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos_empresas.bloquear_rematricula_web` | Yes | Yes | `students.source_block_reenrollment_web` | cast 0/1 to boolean | optional | policy flag | Low | Medium | No | Needs Review |
| `UsaApp` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_alunos_empresas.usa_app` | Yes | Yes | `students.source_uses_app` | cast 0/1 to boolean | optional | product analytics | Low | Medium | No | Probably raw-only for MVP |
| `DataUltimoAcessoApp` | `blank` | `760` | - | integration field | `sponte_raw_alunos_empresas.data_ultimo_acesso_app` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `DataAtivacaoApp` | `date-ish string` | `745` | `1/24/2022 1:59:16 PM`, `11/26/2024 2:46:26 PM` | date/time candidate | `sponte_raw_alunos_empresas.data_ativacao_app` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataDesativacaoApp` | `blank` | `760` | - | date/time candidate | `sponte_raw_alunos_empresas.data_desativacao_app` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecordValue` | `integer-ish` | `0` | `4`, `6`, `3` | text / code | `sponte_raw_alunos_empresas.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `UsaAppAgendaPlus` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos_empresas.usa_app_agenda_plus` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UltimoRetornoAgendaPlus` | `blank` | `760` | - | text / code | `sponte_raw_alunos_empresas.ultimo_retorno_agenda_plus` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UltimoAcessoAgendaPlus` | `string` | `759` | `6/25/2024 7:59:42 PM` | integration field | `sponte_raw_alunos_empresas.ultimo_acesso_agenda_plus` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `TranscriptAEI` | `blank` | `760` | - | text / code | `sponte_raw_alunos_empresas.transcript_aei` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TranscriptDateEntry` | `blank` | `760` | - | text / code | `sponte_raw_alunos_empresas.transcript_date_entry` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TranscriptDateGraduated` | `blank` | `760` | - | text / code | `sponte_raw_alunos_empresas.transcript_date_graduated` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TranscriptEnglishLanguage` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos_empresas.transcript_english_language` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TranscriptSituacao` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_alunos_empresas.transcript_situacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `QtdIgnorarSenha` | `integer-ish` | `0` | `0`, `1`, `2` | boolean candidate | `sponte_raw_alunos_empresas.qtd_ignorar_senha` | Yes | Yes | Raw only | - | - | - | - | High | No | Legacy password or secret material; never promote to app layer |
| `TentativasAcesso` | `integer-ish` | `0` | `0`, `4`, `1` | integration field | `sponte_raw_alunos_empresas.tentativas_acesso` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |

## Cursos.xlsx

- Sheet: `Cursos`
- Rows: `28`
- Raw table: `sponte_raw_cursos`
- Primary key: `CursoID`
- Purpose: Course catalog

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `CursoID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_cursos.curso_id` | Yes | Yes | `courses.source_course_id` | preserve source id | required | primary source key | High | Low | No | Primary course key |
| `Nome` | `string` | `0` | `Maternal - 1`, `Maternal - 2`, `Maternal - 3` | text / code | `sponte_raw_cursos.nome` | Yes | Yes | `courses.name` | trim text | required | course identity | High | Low | No | Searchable course name |
| `RegimeID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_cursos.regime_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_cursos.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `CoordenadorID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_cursos.coordenador_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoCursoID` | `integer-ish` | `0` | `-1`, `-2`, `6` | ID / enum candidate | `sponte_raw_cursos.tipo_curso_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Etapas` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_cursos.etapas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroVagas` | `integer-ish` | `0` | `10`, `16`, `0` | text / code | `sponte_raw_cursos.numero_vagas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CurriculoCurso` | `blank` | `28` | - | binary/blob/path field | `sponte_raw_cursos.curriculo_curso` | Yes | Yes | Raw only | - | - | - | - | High | No | Binary/blob/file-path placeholder or large artifact reference; preserve raw-only |
| `PerfilCurso` | `blank` | `28` | - | text / code | `sponte_raw_cursos.perfil_curso` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Sigla` | `string` | `0` | `Bia`, `Nico`, `Clar` | text / code | `sponte_raw_cursos.sigla` | Yes | Yes | `courses.short_name` | trim text | optional | course identity | Medium | Low | No | Useful display label |
| `Ativo` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_cursos.ativo` | Yes | Yes | `courses.active` | cast 0/1 to boolean | required | course status | High | Low | No | Operational filter |
| `MensalidadeParcelas` | `blank` | `28` | - | text / code | `sponte_raw_cursos.mensalidade_parcelas` | Yes | Yes | `courses.default_monthly_installments` | cast numeric if valid | optional | finance default | Medium | Medium | No | Template only, not transaction truth |
| `MensalidadeValor` | `blank` | `28` | - | money candidate | `sponte_raw_cursos.mensalidade_valor` | Yes | Yes | `courses.default_monthly_amount` | cast money | optional | finance default | Medium | Medium | No | Template only, not transaction truth |
| `MensalidadePlanoContasID` | `blank` | `28` | - | ID / FK candidate | `sponte_raw_cursos.mensalidade_plano_contas_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MensalidadeDataInicial` | `blank` | `28` | - | date/time candidate | `sponte_raw_cursos.mensalidade_data_inicial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MaterialParcelas` | `blank` | `28` | - | text / code | `sponte_raw_cursos.material_parcelas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MaterialValor` | `blank` | `28` | - | money candidate | `sponte_raw_cursos.material_valor` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MaterialPlanoContasID` | `blank` | `28` | - | ID / FK candidate | `sponte_raw_cursos.material_plano_contas_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MaterialDataInicial` | `blank` | `28` | - | date/time candidate | `sponte_raw_cursos.material_data_inicial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OutroParcelas` | `blank` | `28` | - | text / code | `sponte_raw_cursos.outro_parcelas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OutroValor` | `blank` | `28` | - | money candidate | `sponte_raw_cursos.outro_valor` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OutroPlanoContasID` | `blank` | `28` | - | ID / FK candidate | `sponte_raw_cursos.outro_plano_contas_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OutroDataInicial` | `blank` | `28` | - | date/time candidate | `sponte_raw_cursos.outro_data_inicial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SistemaAvaliacaoID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_cursos.sistema_avaliacao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Jubilamento` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.jubilamento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `IdadeMinima` | `integer-ish` | `0` | `1`, `0`, `5` | text / code | `sponte_raw_cursos.idade_minima` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Dependencias` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.dependencias` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Requisitos` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.requisitos` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MatriculaParcelas` | `blank` | `28` | - | text / code | `sponte_raw_cursos.matricula_parcelas` | Yes | Yes | `courses.default_enrollment_fee_installments` | cast numeric if valid | optional | finance default | Medium | Medium | No | Template only |
| `MatriculaValor` | `blank` | `28` | - | money candidate | `sponte_raw_cursos.matricula_valor` | Yes | Yes | `courses.default_enrollment_fee_amount` | cast money | optional | finance default | Medium | Medium | No | Template only |
| `MatriculaPlanoContasID` | `blank` | `28` | - | ID / FK candidate | `sponte_raw_cursos.matricula_plano_contas_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MatriculaDataInicial` | `blank` | `28` | - | date/time candidate | `sponte_raw_cursos.matricula_data_inicial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SerieID` | `integer-ish` | `0` | `-5`, `-4`, `-3` | ID / enum candidate | `sponte_raw_cursos.serie_id` | Yes | Yes | `courses.series_id` | join to series.source_series_id | optional | FK series.source_series_id | High | Low | No | School stage mapping |
| `AlunosPontoEquilibrio` | `integer-ish` | `0` | `5`, `0`, `10` | text / code | `sponte_raw_cursos.alunos_ponto_equilibrio` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Ato` | `blank` | `28` | - | text / code | `sponte_raw_cursos.ato` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ReconhecimentoCurso` | `blank` | `28` | - | text / code | `sponte_raw_cursos.reconhecimento_curso` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EixoCurso` | `blank` | `28` | - | text / code | `sponte_raw_cursos.eixo_curso` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NomeInstituicao` | `string` | `0` | `Colégio Alta Vista`, `COLÉGIO ALTA VISTA` | text / code | `sponte_raw_cursos.nome_instituicao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MesVencimentoAtual` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.mes_vencimento_atual` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MensalidadeValorPrimeiraParcela` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.mensalidade_valor_primeira_parcela` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorMinimoMensalidade` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.valor_minimo_mensalidade` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorMinimoMaterial` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.valor_minimo_material` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorMinimoTaxa` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.valor_minimo_taxa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroAulas` | `integer-ish` | `0` | `0`, `5` | text / code | `sponte_raw_cursos.numero_aulas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MinimoAlunos` | `integer-ish` | `0` | `0`, `5` | text / code | `sponte_raw_cursos.minimo_alunos` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `HorasAula` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.horas_aula` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CargaHoraria` | `date-ish string` | `25` | `000:00`, `___:__` | date/time candidate | `sponte_raw_cursos.carga_horaria` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AtividadeComplementarModular` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.atividade_complementar_modular` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsaPoliticaComercial` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.usa_politica_comercial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoPoliticaComercial` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.tipo_politica_comercial` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorMinimoParcMensalidade` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.valor_minimo_parc_mensalidade` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorMinimoParcTaxa` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.valor_minimo_parc_taxa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorMinimoParcMaterial` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_cursos.valor_minimo_parc_material` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroMaximoParcMensalidade` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.numero_maximo_parc_mensalidade` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroMaximoParcTaxa` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.numero_maximo_parc_taxa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroMaximoParcMaterial` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.numero_maximo_parc_material` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoFormacao` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.tipo_formacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `GrauAcademico` | `blank` | `28` | - | text / code | `sponte_raw_cursos.grau_academico` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Intitulado` | `blank` | `28` | - | text / code | `sponte_raw_cursos.intitulado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ModalidadeEnsino` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_cursos.modalidade_ensino` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecordValue` | `integer-ish` | `0` | `10`, `4`, `7` | text / code | `sponte_raw_cursos.record_value` | Yes | Yes | `courses.source_record_value` | preserve source technical value | optional | source metadata | Low | Medium | No | Raw useful for traceability only |
| `UsaCompetencias` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_cursos.usa_competencias` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## Series.xlsx

- Sheet: `Series`
- Rows: `19`
- Raw table: `sponte_raw_series`
- Primary key: `SerieID`
- Purpose: Series / school stage lookup

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SerieID` | `integer-ish` | `0` | `-6`, `-5`, `-4` | ID / enum candidate | `sponte_raw_series.serie_id` | Yes | Yes | `series.source_series_id` | preserve source id | required | primary source key | High | Low | No | Primary series key |
| `TipoCursoID` | `integer-ish` | `0` | `-1`, `0`, `-2` | ID / enum candidate | `sponte_raw_series.tipo_curso_id` | Yes | Yes | `series.source_course_type_id` | preserve source lookup id | optional | lookup hint | Medium | Medium | No | Needs Review if modeled later |
| `Nome` | `string` | `0` | `Berçário 1`, `Maternal I`, `Maternal II` | text / code | `sponte_raw_series.nome` | Yes | Yes | `series.name` | trim text | required | series identity | High | Low | No | Search/display field |
| `Escolaridade` | `string` | `0` | `Ensino Infantil Incompleto`, `Indefinido`, `Ensino Fundamental Incompleto` | text / code | `sponte_raw_series.escolaridade` | Yes | Yes | `series.school_stage` | trim text | optional | stage label | High | Low | No | Useful search/filter label |

## Turnos.xlsx

- Sheet: `Turnos`
- Rows: `4`
- Raw table: `sponte_raw_turnos`
- Primary key: `TurnoID`
- Purpose: Shift lookup

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `TurnoID` | `integer-ish` | `0` | `-4`, `-3`, `-2` | ID / enum candidate | `sponte_raw_turnos.turno_id` | Yes | Yes | `shifts.source_shift_id` | preserve source id | required | primary source key | High | Low | No | Primary shift key |
| `Descricao` | `string` | `0` | `INTEGRAL`, `NOITE`, `TARDE` | text / code | `sponte_raw_turnos.descricao` | Yes | Yes | `shifts.name` | trim text | required | shift identity | High | Low | No | Search/display field |
| `Ativo` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_turnos.ativo` | Yes | Yes | `shifts.active` | cast 0/1 to boolean | required | shift status | High | Low | No | Operational filter |
| `RecordValue` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_turnos.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |

## Salas.xlsx

- Sheet: `Salas`
- Rows: `28`
- Raw table: `sponte_raw_salas`
- Primary key: `SalaID`
- Purpose: Room catalog

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SalaID` | `integer-ish` | `0` | `33`, `2`, `8` | ID / FK candidate | `sponte_raw_salas.sala_id` | Yes | Yes | `rooms.source_room_id` | preserve source id | required | primary source key | High | Low | No | Primary room key |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_salas.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `Sigla` | `string` | `0` | `1º ANO MANHÃ B`, `1º MANHÃ A`, `1º Período M-1` | text / code | `sponte_raw_salas.sigla` | Yes | Yes | `rooms.code` | trim text | optional | room identity | Medium | Low | No | Search/display field |
| `Descricao` | `string` | `0` | `1º ANO MANHÃ B`, `1º ANO MANHÃ A`, `1º PERÍODO MANHÃ` | text / code | `sponte_raw_salas.descricao` | Yes | Yes | `rooms.name` | trim text | required | room identity | High | Low | No | Search/display field |
| `Vagas` | `integer-ish` | `0` | `20`, `25`, `12` | text / code | `sponte_raw_salas.vagas` | Yes | Yes | `rooms.capacity` | cast integer if valid | optional | room capacity | Medium | Low | No | Operational context |
| `TiposSalasID` | `integer-ish` | `0` | `-2` | ID / enum candidate | `sponte_raw_salas.tipos_salas_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Ativo` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_salas.ativo` | Yes | Yes | `rooms.active` | cast 0/1 to boolean | required | room status | High | Low | No | Operational filter |
| `AulaLivre` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_salas.aula_livre` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PermiteLocacao` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_salas.permite_locacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorHoraLocacao` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_salas.valor_hora_locacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LocacaoAmbienteHorarioID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_salas.locacao_ambiente_horario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecordValue` | `integer-ish` | `0` | `1`, `3`, `2` | text / code | `sponte_raw_salas.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |

## Turmas.xlsx

- Sheet: `Turmas`
- Rows: `128`
- Raw table: `sponte_raw_turmas`
- Primary key: `TurmaID`
- Purpose: Class master records

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `TurmaID` | `integer-ish` | `0` | `18`, `3`, `4` | ID / FK candidate | `sponte_raw_turmas.turma_id` | Yes | Yes | `classes.source_class_id` | preserve source id | required | primary source key | High | Low | No | Primary class key |
| `Nome` | `string` | `0` | `Bia - Manhã - 2023 - turma 1`, `Bia - Manhã - 2022`, `Bia - Tarde - 2022` | text / code | `sponte_raw_turmas.nome` | Yes | Yes | `classes.name` | trim text | required | class identity | High | Low | Yes | Primary search field |
| `Sigla` | `blank` | `128` | - | text / code | `sponte_raw_turmas.sigla` | Yes | Yes | `classes.short_name` | trim text | optional | class identity | Medium | Low | Yes | Display label |
| `CursoID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_turmas.curso_id` | Yes | Yes | `classes.course_id` | join to courses.source_course_id | required | FK courses.source_course_id | High | Low | No | Class course link |
| `Etapa` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_turmas.etapa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TurnoID` | `integer-ish` | `0` | `-1`, `-2`, `-4` | ID / enum candidate | `sponte_raw_turmas.turno_id` | Yes | Yes | `classes.shift_id` | join to shifts.source_shift_id | optional | FK shifts.source_shift_id | High | Low | No | Class shift link |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_turmas.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `SalaID` | `integer-ish` | `0` | `0`, `5`, `3` | ID / FK candidate | `sponte_raw_turmas.sala_id` | Yes | Yes | `classes.room_id` | join to rooms.source_room_id | optional | FK rooms.source_room_id | High | Low | No | Class room link |
| `HorarioID` | `date-ish string` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_turmas.horario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FuncionarioID` | `integer-ish` | `0` | `0`, `3`, `23` | ID / FK candidate | `sponte_raw_turmas.funcionario_id` | Yes | Yes | `classes.source_staff_owner_id` | preserve source FK | optional | legacy staff association | Low | Medium | No | Needs Review |
| `CalendarioID` | `integer-ish` | `0` | `0`, `1`, `9` | ID / FK candidate | `sponte_raw_turmas.calendario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataInicio` | `date-ish string` | `0` | `2/6/2023 12:00:00 AM`, `2/1/2022 12:00:00 AM`, `2/3/2022 12:00:00 AM` | date/time candidate | `sponte_raw_turmas.data_inicio` | Yes | Yes | `classes.start_date` | normalize Excel datetime to date | optional | class timeline | High | Low | No | School year context |
| `DataTermino` | `date-ish string` | `6` | `12/14/2023 12:00:00 AM`, `12/15/2022 12:00:00 AM`, `12/20/2024 12:00:00 AM` | date/time candidate | `sponte_raw_turmas.data_termino` | Yes | Yes | `classes.end_date` | normalize Excel datetime to date | optional | class timeline | High | Low | No | School year context |
| `Situacao` | `integer-ish` | `0` | `-2`, `-1` | text / code | `sponte_raw_turmas.situacao` | Yes | Yes | `classes.status_code` | preserve source code and decode later if needed | required | class status | Medium | Medium | No | Needs lookup if available |
| `AnoLetivo` | `integer-ish` | `0` | `2023`, `2022`, `2024` | text / code | `sponte_raw_turmas.ano_letivo` | Yes | Yes | `classes.school_year` | cast integer if valid | required | class year | High | Low | Yes | Core filter field |
| `NumeroAlunos` | `integer-ish` | `0` | `20`, `16`, `10` | text / code | `sponte_raw_turmas.numero_alunos` | Yes | Yes | `classes.capacity_planned` | cast integer if valid | optional | capacity | Medium | Low | No | Operational context only |
| `Observacao` | `blank` | `128` | - | text / code | `sponte_raw_turmas.observacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TurmaModular` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.turma_modular` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoPagamentoID` | `date-ish string` | `0` | `0`, `-1` | ID / FK candidate | `sponte_raw_turmas.tipo_pagamento_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorTurma` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.valor_turma` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SistemaAvaliacaoPadraoID` | `integer-ish` | `0` | `0`, `2` | ID / FK candidate | `sponte_raw_turmas.sistema_avaliacao_padrao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Codigo` | `integer-ish` | `0` | `17`, `2`, `3` | text / code | `sponte_raw_turmas.codigo` | Yes | Yes | `classes.external_code` | trim text | optional | class identity | Low | Medium | No | Needs Review |
| `TipoTurma` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.tipo_turma` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoDiario` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_turmas.tipo_diario` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MinimoAlunos` | `integer-ish` | `0` | `20`, `5`, `0` | text / code | `sponte_raw_turmas.minimo_alunos` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Investimento` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.investimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ModalidadeTurma` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.modalidade_turma` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OrdemTurma` | `integer-ish` | `0` | `0`, `2`, `1` | text / code | `sponte_raw_turmas.ordem_turma` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecordValue` | `integer-ish` | `0` | `2`, `3`, `5` | text / code | `sponte_raw_turmas.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `UtilizaQuadroHorariosQuinzenal` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.utiliza_quadro_horarios_quinzenal` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroAlunosEstimado` | `integer-ish` | `0` | `0`, `20`, `201` | text / code | `sponte_raw_turmas.numero_alunos_estimado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SincronizadoAPP` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turmas.sincronizado_app` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CrmID` | `blank` | `128` | - | ID / FK candidate | `sponte_raw_turmas.crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `AnoLetivoCrmID` | `blank` | `128` | - | ID / FK candidate | `sponte_raw_turmas.ano_letivo_crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `PedidoVendaCrmID` | `blank` | `128` | - | ID / FK candidate | `sponte_raw_turmas.pedido_venda_crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `LexID` | `blank` | `128` | - | ID / FK candidate | `sponte_raw_turmas.lex_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |

## TurmaAlunos.xlsx

- Sheet: `TurmaAlunos`
- Rows: `1400`
- Raw table: `sponte_raw_turma_alunos`
- Primary key: `TurmaAlunoID`
- Purpose: Class membership records

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `TurmaAlunoID` | `integer-ish` | `0` | `260`, `257`, `265` | ID / FK candidate | `sponte_raw_turma_alunos.turma_aluno_id` | Yes | Yes | `class_memberships.source_membership_id` | preserve source id | required | primary source key | High | Low | No | Primary membership key |
| `TurmaID` | `integer-ish` | `0` | `44`, `49`, `40` | ID / FK candidate | `sponte_raw_turma_alunos.turma_id` | Yes | Yes | `class_memberships.class_id` | join to classes.source_class_id | required | FK classes.source_class_id | High | Low | No | Membership class link |
| `AlunoID` | `integer-ish` | `0` | `152`, `61`, `54` | ID / FK candidate | `sponte_raw_turma_alunos.aluno_id` | Yes | Yes | `class_memberships.student_id` | join to students.source_student_id | required | FK students.source_student_id | High | Low | No | Membership student link |
| `DataMatricula` | `date-ish string` | `0` | `1/30/2023 12:00:00 AM`, `1/25/2023 12:00:00 AM`, `2/1/2023 12:00:00 AM` | date/time candidate | `sponte_raw_turma_alunos.data_matricula` | Yes | Yes | `class_memberships.joined_at` | normalize Excel datetime to date | optional | membership timeline | High | Low | No | Enrollment start in class |
| `TipoMatricula` | `integer-ish` | `0` | `-1`, `-2` | text / code | `sponte_raw_turma_alunos.tipo_matricula` | Yes | Yes | `class_memberships.source_membership_type_code` | preserve source code | optional | membership subtype | Low | Medium | No | Needs Review |
| `Transferido` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_turma_alunos.transferido` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Observacao` | `blank` | `1400` | - | text / code | `sponte_raw_turma_alunos.observacao` | Yes | Yes | `class_memberships.note` | trim text | optional | membership note | Medium | Low | No | Free-text context |
| `ContratoTurmaID` | `integer-ish` | `0` | `7208`, `7205`, `7213` | ID / FK candidate | `sponte_raw_turma_alunos.contrato_turma_id` | Yes | Yes | `class_memberships.source_enrollment_id` | join to enrollments.source_enrollment_id | optional | FK enrollments.source_enrollment_id | High | Low | No | Bridge to normalized enrollment |
| `SituacaoDidaticaID` | `integer-ish` | `0` | `-1`, `-5`, `-7` | ID / enum candidate | `sponte_raw_turma_alunos.situacao_didatica_id` | Yes | Yes | `class_memberships.academic_status` | decode via SituacoesDidaticas and store code + label | optional | lookup SituacoesDidaticas.xlsx | High | Low | No | Operational student status in class |
| `NumChamada` | `integer-ish` | `0` | `0`, `4`, `1` | text / code | `sponte_raw_turma_alunos.num_chamada` | Yes | Yes | `class_memberships.roll_number` | cast integer if valid | optional | class roster | Medium | Low | No | Useful operational field |
| `Removido` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_turma_alunos.removido` | Yes | Yes | `class_memberships.removed` | cast 0/1 to boolean | optional | membership state | High | Low | No | Operational filter |
| `MudancaId` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_turma_alunos.mudanca_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AlterouManualmenteSituacaoFinal` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_turma_alunos.alterou_manualmente_situacao_final` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## Contratos.xlsx

- Sheet: `Contratos`
- Rows: `1397`
- Raw table: `sponte_raw_contratos`
- Primary key: `ContratoID`
- Purpose: Student contract headers

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ContratoID` | `integer-ish` | `0` | `95`, `2`, `3` | ID / FK candidate | `sponte_raw_contratos.contrato_id` | Yes | Yes | `contracts.source_contract_id` | preserve source id | required | primary source key | High | Low | No | Primary contract key |
| `TipoContratoID` | `integer-ish` | `0` | `-2`, `-1`, `-3` | ID / enum candidate | `sponte_raw_contratos.tipo_contrato_id` | Yes | Yes | `contracts.contract_type` | decode via TiposContrato and store code + label | required | lookup TiposContrato.xlsx | High | Low | No | Matrícula vs rematrícula |
| `ResponsavelID` | `integer-ish` | `0` | `38`, `18`, `12` | ID / FK candidate | `sponte_raw_contratos.responsavel_id` | Yes | Yes | `contracts.guardian_id` | join to guardians.source_guardian_id allow null | optional | FK guardians.source_guardian_id | High | Medium | No | 102 missing refs in source |
| `AlunoID` | `integer-ish` | `0` | `22`, `10`, `7` | ID / FK candidate | `sponte_raw_contratos.aluno_id` | Yes | Yes | `contracts.student_id` | join to students.source_student_id | required | FK students.source_student_id | High | Low | No | Contract student link |
| `FuncionarioID` | `integer-ish` | `0` | `7`, `5`, `83` | ID / FK candidate | `sponte_raw_contratos.funcionario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `MotivoCancelamentoID` | `integer-ish` | `0` | `0`, `-1`, `3` | ID / FK candidate | `sponte_raw_contratos.motivo_cancelamento_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsuarioID` | `integer-ish` | `0` | `6`, `16`, `1` | ID / FK candidate | `sponte_raw_contratos.usuario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_contratos.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `NumeroContrato` | `string` | `0` | `21/2`, `9/1`, `6/1` | text / code | `sponte_raw_contratos.numero_contrato` | Yes | Yes | `contracts.contract_number` | trim text preserve leading zeros | optional | search / contract key | High | Low | Yes | Searchable contract number |
| `DataInicio` | `date-ish string` | `0` | `8/1/2022 12:00:00 AM`, `2/1/2022 12:00:00 AM`, `2/3/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contratos.data_inicio` | Yes | Yes | `contracts.start_date` | normalize Excel datetime to date | optional | contract timeline | High | Low | No | Contract start |
| `DataTermino` | `date-ish string` | `15` | `12/15/2022 12:00:00 AM`, `12/14/2023 12:00:00 AM`, `4/18/2023 12:00:00 AM` | date/time candidate | `sponte_raw_contratos.data_termino` | Yes | Yes | `contracts.end_date` | normalize Excel datetime to date | optional | contract timeline | High | Low | No | Contract end |
| `DataContrato` | `date-ish string` | `0` | `9/13/2021 12:00:00 AM`, `12/13/2021 12:00:00 AM`, `1/6/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contratos.data_contrato` | Yes | Yes | `contracts.contract_date` | normalize Excel datetime to date | optional | contract timeline | High | Low | No | Contract signature date |
| `Observacoes` | `string` | `656` | `Como não temos informação se de fato é d`, `A 1a. matrícula foi cancelada
Nova matrí`, `Responsável enviado para SPC em 04/04/20` | text / code | `sponte_raw_contratos.observacoes` | Yes | Yes | `contracts.note` | trim text | optional | contract note | Medium | Low | No | Free-text context |
| `Situacao` | `integer-ish` | `0` | `2`, `3`, `4` | text / code | `sponte_raw_contratos.situacao` | Yes | Yes | `contracts.status_code` | preserve source code and decode later if needed | optional | contract status | Medium | Medium | Yes | Needs Review |
| `PercentualEmpresa` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contratos.percentual_empresa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataEncerramento` | `date-ish string` | `409` | `5/13/2024 12:00:00 AM`, `1/19/2022 12:00:00 AM`, `1/20/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contratos.data_encerramento` | Yes | Yes | `contracts.ended_at` | normalize Excel datetime to date | optional | contract timeline | Medium | Low | No | Contract closure date |
| `MotivoDesistenciaID` | `integer-ish` | `0` | `0`, `-1`, `2` | ID / enum candidate | `sponte_raw_contratos.motivo_desistencia_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PagamentoComissaoID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contratos.pagamento_comissao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `EmpresaPaga` | `string` | `11` | `0;0;0;0` | text / code | `sponte_raw_contratos.empresa_paga` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorTaxa` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contratos.valor_taxa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsuarioAlteracaoID` | `date-ish string` | `0` | `16`, `1`, `6` | ID / FK candidate | `sponte_raw_contratos.usuario_alteracao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataAlteracao` | `date-ish string` | `0` | `5/13/2024 9:32:23 AM`, `5/13/2024 9:37:43 AM`, `5/13/2024 9:46:49 AM` | date/time candidate | `sponte_raw_contratos.data_alteracao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecordValue` | `integer-ish` | `0` | `3`, `10`, `17` | text / code | `sponte_raw_contratos.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `ResponsavelTestemunhaID` | `boolean-ish` | `0` | `0`, `263`, `53` | ID / FK candidate | `sponte_raw_contratos.responsavel_testemunha_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PedagogicoPendenteSincronizacaoApp` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_contratos.pedagogico_pendente_sincronizacao_app` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## ContratosTurmas.xlsx

- Sheet: `ContratosTurmas`
- Rows: `1399`
- Raw table: `sponte_raw_contratos_turmas`
- Primary key: `ContratoTurmaID`
- Purpose: Enrollment / contract-class bridge

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ContratoTurmaID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_contratos_turmas.contrato_turma_id` | Yes | Yes | `enrollments.source_enrollment_id` | preserve source id | required | primary source key | High | Low | No | Primary enrollment key |
| `ContratoID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_contratos_turmas.contrato_id` | Yes | Yes | `enrollments.contract_id` | join to contracts.source_contract_id | required | FK contracts.source_contract_id | High | Low | No | Enrollment contract link |
| `TurmaID` | `integer-ish` | `0` | `3`, `4`, `6` | ID / FK candidate | `sponte_raw_contratos_turmas.turma_id` | Yes | Yes | `enrollments.class_id` | join to classes.source_class_id | required | FK classes.source_class_id | High | Low | No | Enrollment class link |
| `CursoID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_contratos_turmas.curso_id` | Yes | Yes | `enrollments.course_id` | join to courses.source_course_id | optional | FK courses.source_course_id | High | Low | No | Denormalized but useful |
| `TipoCursoID` | `integer-ish` | `0` | `-1`, `-2`, `6` | ID / enum candidate | `sponte_raw_contratos_turmas.tipo_curso_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Etapa` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_contratos_turmas.etapa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AnoLetivo` | `integer-ish` | `0` | `2022`, `2023`, `2024` | text / code | `sponte_raw_contratos_turmas.ano_letivo` | Yes | Yes | `enrollments.school_year` | cast integer if valid | required | school year | High | Low | No | Operational filter field |
| `DataMatricula` | `date-ish string` | `0` | `12/13/2021 12:00:00 AM`, `1/6/2022 12:00:00 AM`, `1/18/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contratos_turmas.data_matricula` | Yes | Yes | `enrollments.enrolled_at` | normalize Excel datetime to date | optional | enrollment timeline | High | Low | No | Enrollment date |
| `InicioAtividades` | `blank` | `1399` | - | date/time candidate | `sponte_raw_contratos_turmas.inicio_atividades` | Yes | Yes | `enrollments.activities_started_at` | normalize Excel datetime to date | optional | timeline | Medium | Low | No | Academic timeline |
| `ValorAdicional` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_contratos_turmas.valor_adicional` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Padrao` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_contratos_turmas.padrao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Turno` | `integer-ish` | `0` | `0`, `3` | boolean candidate | `sponte_raw_contratos_turmas.turno` | Yes | Yes | `enrollments.shift_label_snapshot` | trim text | optional | display snapshot | Low | Low | No | String snapshot from source |
| `TerminoAtividades` | `blank` | `1399` | - | date/time candidate | `sponte_raw_contratos_turmas.termino_atividades` | Yes | Yes | `enrollments.activities_ended_at` | normalize Excel datetime to date | optional | timeline | Medium | Low | No | Academic timeline |
| `StatusMatricula` | `boolean-ish` | `0` | `1`, `6` | boolean candidate | `sponte_raw_contratos_turmas.status_matricula` | Yes | Yes | `enrollments.status_code` | preserve source code and decode later if needed | required | enrollment status | Medium | Medium | No | Needs Review |
| `DataStatus` | `blank` | `1399` | - | date/time candidate | `sponte_raw_contratos_turmas.data_status` | Yes | Yes | `enrollments.status_changed_at` | normalize Excel datetime to date | optional | timeline | Medium | Low | No | Status change date |
| `Ordem` | `boolean-ish` | `0` | `0`, `2`, `1` | boolean candidate | `sponte_raw_contratos_turmas.ordem` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CrmID` | `blank` | `1399` | - | ID / FK candidate | `sponte_raw_contratos_turmas.crm_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `LexID` | `blank` | `1399` | - | ID / FK candidate | `sponte_raw_contratos_turmas.lex_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |

## ContratosPlanos.xlsx

- Sheet: `ContratosPlanos`
- Rows: `4695`
- Raw table: `sponte_raw_contratos_planos`
- Primary key: `ContratoPlanoID`
- Purpose: Contract to financial charge bridge

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ContratoPlanoID` | `integer-ish` | `0` | `1`, `2`, `1015` | ID / FK candidate | `sponte_raw_contratos_planos.contrato_plano_id` | Yes | Yes | `charges.source_contract_plan_id` | preserve source id | optional | primary source key for bridge | High | Low | No | Bridge row identity |
| `TurmaID` | `integer-ish` | `0` | `3`, `4`, `6` | ID / FK candidate | `sponte_raw_contratos_planos.turma_id` | Yes | Yes | `charges.class_id` | join to classes.source_class_id | optional | FK classes.source_class_id | Medium | Low | No | Charge-class context |
| `ContratoID` | `integer-ish` | `0` | `2`, `3`, `7` | ID / FK candidate | `sponte_raw_contratos_planos.contrato_id` | Yes | Yes | `charges.contract_id` | join to contracts.source_contract_id | optional | FK contracts.source_contract_id | High | Low | No | Charge-contract bridge |
| `ContaReceberID` | `integer-ish` | `0` | `2`, `3`, `19` | ID / FK candidate | `sponte_raw_contratos_planos.conta_receber_id` | Yes | Yes | `charges.source_charge_id` | join/update by charges.source_charge_id | required | FK charges.source_charge_id | High | Low | No | Bridge to financial charge |
| `TipoPlano` | `integer-ish` | `0` | `0`, `2`, `1` | text / code | `sponte_raw_contratos_planos.tipo_plano` | Yes | Yes | `charges.source_plan_type_code` | preserve source code | optional | plan subtype | Low | Medium | No | Needs Review |
| `ContratoTurmaID` | `integer-ish` | `0` | `1`, `2`, `6` | ID / FK candidate | `sponte_raw_contratos_planos.contrato_turma_id` | Yes | Yes | `charges.source_enrollment_id` | join to enrollments.source_enrollment_id | optional | FK enrollments.source_enrollment_id | High | Low | No | Bridge to enrollment |
| `ParteEmpresa` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contratos_planos.parte_empresa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ContratoAulaLivreID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contratos_planos.contrato_aula_livre_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CursoID` | `boolean-ish` | `0` | `0`, `10`, `5` | ID / FK candidate | `sponte_raw_contratos_planos.curso_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PlanoFinanceiroCursoID` | `integer-ish` | `0` | `0`, `2`, `3` | ID / FK candidate | `sponte_raw_contratos_planos.plano_financeiro_curso_id` | Yes | Yes | `charges.source_financial_plan_id` | preserve source id | optional | financial template ref | Medium | Medium | No | Useful traceability |
| `Modulo` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_contratos_planos.modulo` | Yes | Yes | `charges.source_module_code` | preserve source code | optional | module hint | Low | Medium | No | Needs Review |
| `LancadoPorTurma` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_contratos_planos.lancado_por_turma` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ParcelasAutomaticas` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contratos_planos.parcelas_automaticas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## ContasReceber.xlsx

- Sheet: `ContasReceber`
- Rows: `6373`
- Raw table: `sponte_raw_contas_receber`
- Primary key: `ContaReceberID`
- Purpose: Financial charge headers

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ContaReceberID` | `integer-ish` | `0` | `1231`, `1851`, `2717` | ID / FK candidate | `sponte_raw_contas_receber.conta_receber_id` | Yes | Yes | `charges.source_charge_id` | preserve source id | required | primary source key | High | Low | No | Primary charge key |
| `BolsaID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber.bolsa_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_contas_receber.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `ContaID` | `boolean-ish` | `0` | `0`, `1`, `3` | ID / FK candidate | `sponte_raw_contas_receber.conta_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TipoRecebimentoID` | `integer-ish` | `0` | `-17`, `-4`, `-1` | ID / enum candidate | `sponte_raw_contas_receber.tipo_recebimento_id` | Yes | Yes | `charges.payment_type` | decode via TiposRecebimentos and store code + label | required | lookup TiposRecebimentos.xlsx | High | Low | Yes | Core finance classification |
| `AlunoID` | `integer-ish` | `0` | `150`, `26`, `354` | ID / FK candidate | `sponte_raw_contas_receber.aluno_id` | Yes | Yes | `charges.student_id` | join to students.source_student_id allow 0/null for non-student charges | optional | FK students.source_student_id | High | Medium | No | 377 rows not student-linked |
| `EmpresaID` | `integer-ish` | `0` | `0`, `255`, `173` | ID / FK candidate | `sponte_raw_contas_receber.empresa_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PlanoContaID` | `integer-ish` | `0` | `13`, `152`, `1` | ID / FK candidate | `sponte_raw_contas_receber.plano_conta_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `OperadoraCartaoID` | `boolean-ish` | `0` | `0`, `2` | ID / FK candidate | `sponte_raw_contas_receber.operadora_cartao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorOriginal` | `decimal` | `0` | `1000.0000`, `10984.2000`, `6820.0000` | money candidate | `sponte_raw_contas_receber.valor_original` | Yes | Yes | `charges.amount_original` | cast decimal money | required | charge amount | High | Low | No | Core finance field |
| `Documento` | `string` | `6096` | `renata@altavista`, `carol@altavista`, `admin@altavista` | text / code | `sponte_raw_contas_receber.documento` | Yes | Yes | `charges.document_reference` | trim text | optional | finance reference | Medium | Low | Yes | Searchable if populated |
| `Observacao` | `string` | `4933` | `No dia 24/08 solicitou lanche mensal - c`, `Em setembro cancelou o lanche da manhã e`, `Em setembro o valor pago não contemplou ` | text / code | `sponte_raw_contas_receber.observacao` | Yes | Yes | `charges.note` | trim text preserve line breaks if needed | optional | finance note | High | Low | No | Operational context |
| `Complemento` | `string` | `5966` | `valor proporcional`, `166`, `com 5% desconto` | text / code | `sponte_raw_contas_receber.complemento` | Yes | Yes | `charges.note_secondary` | trim text | optional | finance note | Low | Low | No | Secondary free text |
| `DiaVencimento` | `date-ish string` | `0` | `28`, `1`, `10` | date/time candidate | `sponte_raw_contas_receber.dia_vencimento` | Yes | Yes | `charges.due_day` | cast integer if valid | optional | finance schedule | Medium | Low | No | Header-level due pattern |
| `ContaReceberRenegID` | `integer-ish` | `0` | `0`, `3335`, `2647` | ID / FK candidate | `sponte_raw_contas_receber.conta_receber_reneg_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ParcelasComDesconto` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber.parcelas_com_desconto` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorComDescontoBolsa` | `decimal` | `0` | `1000.0000`, `10984.2000`, `6820.0000` | money candidate | `sponte_raw_contas_receber.valor_com_desconto_bolsa` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MotivoRenegociacaoID` | `integer-ish` | `0` | `0`, `3`, `5` | ID / FK candidate | `sponte_raw_contas_receber.motivo_renegociacao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataRenegociacao` | `date-ish string` | `6106` | `10/2/2024 2:57:17 PM`, `5/14/2024 4:14:34 PM`, `6/17/2024 5:18:21 PM` | date/time candidate | `sponte_raw_contas_receber.data_renegociacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DescontoManual` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_contas_receber.desconto_manual` | Yes | Yes | `charges.manual_discount_amount` | cast decimal money | optional | finance adjustment | Medium | Low | No | Header-level manual discount |
| `MotivoDescontoManual` | `blank` | `6373` | - | money candidate | `sponte_raw_contas_receber.motivo_desconto_manual` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FuncionarioID` | `boolean-ish` | `0` | `0`, `21`, `23` | ID / FK candidate | `sponte_raw_contas_receber.funcionario_id` | Yes | Yes | `charges.source_staff_owner_id` | preserve source FK | optional | legacy staff association | Low | Medium | No | Needs Review |
| `ClienteVindiID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber.cliente_vindi_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `DataCompetencia` | `date-ish string` | `0` | `1/27/2023 12:00:00 AM`, `1/12/2024 12:00:00 AM`, `8/8/2024 12:00:00 AM` | date/time candidate | `sponte_raw_contas_receber.data_competencia` | Yes | Yes | `charges.competency_date` | normalize Excel datetime to date | optional | finance period | High | Low | No | Important reporting field |
| `VencimentoUltimoDia` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_contas_receber.vencimento_ultimo_dia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorAbatimento` | `decimal` | `0` | `0.0000` | money candidate | `sponte_raw_contas_receber.valor_abatimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ClienteStoneID` | `integer-ish` | `0` | `0`, `1045091`, `718669` | ID / FK candidate | `sponte_raw_contas_receber.cliente_stone_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `GrupoSplitStoneID` | `integer-ish` | `0` | `0`, `330165` | ID / FK candidate | `sponte_raw_contas_receber.grupo_split_stone_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `CartaoStoneID` | `integer-ish` | `0` | `0`, `562613`, `613492` | ID / FK candidate | `sponte_raw_contas_receber.cartao_stone_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `EscolaEducbankID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber.escola_educbank_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `PendenteSincronizacaoApp` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_contas_receber.pendente_sincronizacao_app` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorDiferentePrimeiraParcelaAutomatica` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber.valor_diferente_primeira_parcela_automatica` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ValorParcelasAutomaticas` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber.valor_parcelas_automaticas` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataVencimentoProximaParcela` | `blank` | `6373` | - | date/time candidate | `sponte_raw_contas_receber.data_vencimento_proxima_parcela` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataInclusao` | `date-ish string` | `2378` | `8/8/2024 10:33:44 AM`, `8/8/2024 10:34:15 AM`, `6/17/2024 5:18:20 PM` | date/time candidate | `sponte_raw_contas_receber.data_inclusao` | Yes | Yes | `charges.source_created_at` | normalize Excel datetime to timestamp | optional | audit trace | Medium | Low | No | Source creation date |
| `UsuarioID` | `integer-ish` | `0` | `0`, `12`, `16` | ID / FK candidate | `sponte_raw_contas_receber.usuario_id` | Yes | Yes | `charges.source_user_id` | preserve source FK | optional | audit trace | Low | Medium | No | Raw useful for traceability only |
| `SpontePay2SplitID` | `blank` | `6373` | - | ID / FK candidate | `sponte_raw_contas_receber.sponte_pay2_split_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaBoletoSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_contas_receber.habilita_boleto_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaPixSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_contas_receber.habilita_pix_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaCreditoSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_contas_receber.habilita_credito_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `HabilitaRecorrenciaSpontePay2` | `boolean-ish` | `0` | `1` | integration field | `sponte_raw_contas_receber.habilita_recorrencia_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `NumeroMaximoParcelasSpontePay2` | `integer-ish` | `0` | `12` | integration field | `sponte_raw_contas_receber.numero_maximo_parcelas_sponte_pay2` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |

## ContasReceberParcelas.xlsx

- Sheet: `ContasReceberParcelas`
- Rows: `33369`
- Raw table: `sponte_raw_contas_receber_parcelas`
- Primary key: `ContaReceberID+NumeroParcela`
- Purpose: Financial installment history

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ContaReceberID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.conta_receber_id` | Yes | Yes | `charge_installments.charge_id` | join to charges.source_charge_id | required | FK charges.source_charge_id | High | Low | No | Primary installment bridge |
| `NumeroParcela` | `integer-ish` | `0` | `1`, `2`, `3` | text / code | `sponte_raw_contas_receber_parcelas.numero_parcela` | Yes | Yes | `charge_installments.installment_number` | cast integer if valid | required | composite key | High | Low | No | Primary installment sequence |
| `TipoRecebimentoID` | `integer-ish` | `0` | `-17`, `-4`, `-18` | ID / enum candidate | `sponte_raw_contas_receber_parcelas.tipo_recebimento_id` | Yes | Yes | `charge_installments.payment_type` | decode via TiposRecebimentos and store code + label | required | lookup TiposRecebimentos.xlsx | High | Low | No | Core finance classification |
| `PlanoContaID` | `integer-ish` | `0` | `1`, `2`, `12` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.plano_conta_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ContaID` | `integer-ish` | `0` | `3`, `1`, `5` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.conta_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Valor` | `decimal` | `0` | `1397.0000`, `998.5000`, `1022.0000` | money candidate | `sponte_raw_contas_receber_parcelas.valor` | Yes | Yes | `charge_installments.amount_due` | cast decimal money | required | installment amount | High | Low | No | Core finance field |
| `ValorPago` | `decimal` | `0` | `838.2000`, `1397.0000`, `998.5000` | money candidate | `sponte_raw_contas_receber_parcelas.valor_pago` | Yes | Yes | `charge_installments.amount_paid` | cast decimal money | required | installment payment | High | Low | No | Core finance field |
| `DataVencimento` | `date-ish string` | `0` | `2/10/2022 12:00:00 AM`, `3/10/2022 12:00:00 AM`, `4/11/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_vencimento` | Yes | Yes | `charge_installments.due_date` | normalize Excel datetime to date | required | installment due date | High | Low | No | Core finance field |
| `DataPagamento` | `date-ish string` | `8989` | `2/4/2022 12:00:00 AM`, `3/3/2022 12:00:00 AM`, `4/1/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_pagamento` | Yes | Yes | `charge_installments.paid_at` | normalize Excel datetime to timestamp/date | optional | installment payment date | High | Low | No | Core finance field |
| `Situacao` | `integer-ish` | `0` | `1`, `2`, `0` | boolean candidate | `sponte_raw_contas_receber_parcelas.situacao` | Yes | Yes | `charge_installments.status_code` | preserve source code and decode later if business confirms mapping | required | installment status | Medium | Medium | Yes | Needs Review before UI labels |
| `NumeroBoleto` | `boolean-ish` | `0` | `0`, `5`, `46` | boolean candidate | `sponte_raw_contas_receber_parcelas.numero_boleto` | Yes | Yes | `charge_installments.bank_slip_number` | trim text preserve leading zeros | optional | finance identifier | Medium | Low | Yes | Searchable when non-zero |
| `ValorDesconto` | `decimal` | `0` | `558.8000`, `0.0000`, `139.7000` | money candidate | `sponte_raw_contas_receber_parcelas.valor_desconto` | Yes | Yes | `charge_installments.discount_amount` | cast decimal money | optional | finance adjustment | High | Low | No | Core finance field |
| `ValorJuro` | `decimal` | `0` | `0.0000`, `20.4500`, `46.3800` | money candidate | `sponte_raw_contas_receber_parcelas.valor_juro` | Yes | Yes | `charge_installments.interest_amount` | cast decimal money | optional | finance adjustment | High | Low | No | Core finance field |
| `SituacaoCNAB` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_contas_receber_parcelas.situacao_cnab` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroRecibo` | `integer-ish` | `0` | `0`, `1`, `10` | boolean candidate | `sponte_raw_contas_receber_parcelas.numero_recibo` | Yes | Yes | `charge_installments.receipt_number` | trim text preserve leading zeros | optional | finance identifier | High | Low | Yes | Searchable receipt number |
| `NumeroCarne` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber_parcelas.numero_carne` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Ocorrencia` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.ocorrencia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroCheque` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.numero_cheque` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `TitularCheque` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.titular_cheque` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `BancoCheque` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.banco_cheque` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AgenciaCheque` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.agencia_cheque` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ContaCheque` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.conta_cheque` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNABID` | `boolean-ish` | `0` | `0`, `2` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.cnabid` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNABRetornoID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.cnab_retorno_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Estorno` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber_parcelas.estorno` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Obs` | `string` | `32008` | `Recorrência cancelada manualmente em 16/`, `Recorrência cancelada manualmente em 12/`, `Recorrência cancelada manualmente em 11/` | text / code | `sponte_raw_contas_receber_parcelas.obs` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `IDPagSeguro` | `blank` | `33369` | - | integration field | `sponte_raw_contas_receber_parcelas.id_pag_seguro` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `StatusPagSeguroID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.status_pag_seguro_id` | Yes | Yes | `charge_installments.source_pagseguro_status_id` | preserve source lookup id raw-only unless needed | optional | integration lookup | Low | High | No | Prefer raw-only for MVP |
| `NaoPermiteDesconto` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_contas_receber_parcelas.nao_permite_desconto` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `BolsaID` | `integer-ish` | `0` | `2`, `0`, `4` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.bolsa_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `MotivoDescontoManual` | `string` | `33346` | `1ª parcela paga de forma integral. Assim`, `Matrícula paga integral. Descontado dest`, `Além do desconto habitual debitamos R$ 7` | money candidate | `sponte_raw_contas_receber_parcelas.motivo_desconto_manual` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DescontoManual` | `decimal` | `0` | `0.0000`, `20.0000`, `50.0000` | money candidate | `sponte_raw_contas_receber_parcelas.desconto_manual` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LancadaComDesconto` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_contas_receber_parcelas.lancada_com_desconto` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Reajuste` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber_parcelas.reajuste` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CNABResumoID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.cnab_resumo_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `FaturaID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.fatura_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ContaReceberRenegID` | `boolean-ish` | `0` | `0`, `2627`, `4444` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.conta_receber_reneg_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `BolsaCursoID` | `boolean-ish` | `0` | `0`, `28`, `29` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.bolsa_curso_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataReferencia` | `date-ish string` | `0` | `2/1/2022 12:00:00 AM`, `3/1/2022 12:00:00 AM`, `4/1/2022 12:00:00 AM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_referencia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsuarioAlteracaoID` | `date-ish string` | `0` | `-200`, `4`, `1` | ID / enum candidate | `sponte_raw_contas_receber_parcelas.usuario_alteracao_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataAlteracao` | `date-ish string` | `0` | `2/9/2022 5:56:34 PM`, `3/4/2022 8:11:05 AM`, `4/2/2022 4:51:35 AM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_alteracao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `RecebimentoAPIID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.recebimento_apiid` | Yes | Yes | `charge_installments.source_recebimento_api_id` | preserve raw-only | optional | integration field | Low | High | No | Integration internals |
| `GrupoSplitSiclosPagamentosID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.grupo_split_siclos_pagamentos_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `BoletoAutomatizadoID` | `string` | `16995` | `41c19132-b142-4fcb-aae9-3de40b0dd79b`, `9f7e4504-0f57-4cb0-a518-2c3fc506e984`, `0db85c1c-9db3-4f3e-8283-9c93dbc97ad9` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.boleto_automatizado_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroBoletoAutomatizado` | `integer-ish` | `0` | `19541369`, `20303119`, `21156262` | text / code | `sponte_raw_contas_receber_parcelas.numero_boleto_automatizado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SituacaoBoletoAutomatizado` | `integer-ish` | `0` | `4`, `0`, `2` | text / code | `sponte_raw_contas_receber_parcelas.situacao_boleto_automatizado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataGeracaoBoletoAutomatizado` | `date-ish string` | `16985` | `2/4/2022 5:29:23 PM`, `3/3/2022 10:41:37 AM`, `4/1/2022 9:35:30 AM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_geracao_boleto_automatizado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LinkBoletoAutomatizado` | `string` | `17025` | `https://prod-vg-sponte-assets.s3.amazona`, `https://prod-vg-sponte-assets.s3.amazona`, `https://prod-vg-sponte-assets.s3.amazona` | text / code | `sponte_raw_contas_receber_parcelas.link_boleto_automatizado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LinhaDigitavelBoletoAutomatizado` | `integer-ish` | `17024` | `3419109198541369789363133921000278892000`, `3419109206303119289383133921000258920000`, `3419109214156262689303133921000218952000` | text / code | `sponte_raw_contas_receber_parcelas.linha_digitavel_boleto_automatizado` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `PlanoStoneID` | `integer-ish` | `0` | `0`, `611980`, `644886` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.plano_stone_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `BoletoAutomatizadoReferenciaID` | `string` | `16996` | `8022268a-fe9f-4262-a8a8-ed6201069394`, `0a2c31fc-2800-43ee-9e8d-e28226f5d33b`, `21e4b38c-3a7c-4222-ba7e-2788ffe2c8a2` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.boleto_automatizado_referencia_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `NumeroBoletoSpontePay` | `boolean-ish` | `0` | `0` | integration field | `sponte_raw_contas_receber_parcelas.numero_boleto_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `SituacaoBoletoSpontePay` | `boolean-ish` | `0` | `0` | integration field | `sponte_raw_contas_receber_parcelas.situacao_boleto_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `DataGeracaoBoletoSpontePay` | `blank` | `33369` | - | integration field | `sponte_raw_contas_receber_parcelas.data_geracao_boleto_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `DataExpiracaoPixSpontePay` | `date-ish string` | `31946` | `8/19/2024 12:00:00 AM`, `8/21/2024 12:00:00 AM`, `7/19/2024 12:00:00 AM` | integration field | `sponte_raw_contas_receber_parcelas.data_expiracao_pix_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `DataGeracaoPixSpontePay` | `date-ish string` | `31945` | `8/13/2024 3:13:33 PM`, `8/13/2024 3:14:37 PM`, `8/20/2024 11:56:29 AM` | integration field | `sponte_raw_contas_receber_parcelas.data_geracao_pix_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `LinkBoletoSpontePay` | `blank` | `33369` | - | integration field | `sponte_raw_contas_receber_parcelas.link_boleto_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `LinhaDigitavelBoletoSpontePay` | `blank` | `33369` | - | integration field | `sponte_raw_contas_receber_parcelas.linha_digitavel_boleto_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `NumeroPixSpontePay` | `boolean-ish` | `0` | `0`, `3109241259`, `3109245593` | integration field | `sponte_raw_contas_receber_parcelas.numero_pix_sponte_pay` | Yes | Yes | `charge_installments.source_pix_number` | preserve raw-only unless finance support needs it | optional | integration field | Low | High | No | Do not expose by default |
| `PixQrcodeSpontePay` | `string` | `31946` | `00020101021226820014br.gov.bcb.pix2560pi`, `00020101021226820014br.gov.bcb.pix2560pi`, `00020101021226820014br.gov.bcb.pix2560pi` | integration field | `sponte_raw_contas_receber_parcelas.pix_qrcode_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `SituacaoPixSpontePay` | `boolean-ish` | `0` | `0`, `4`, `2` | integration field | `sponte_raw_contas_receber_parcelas.situacao_pix_sponte_pay` | Yes | Yes | `charge_installments.source_pix_status_code` | preserve raw-only unless finance support needs it | optional | integration field | Low | High | No | Do not expose by default |
| `FaturaEducbankID` | `blank` | `33369` | - | ID / FK candidate | `sponte_raw_contas_receber_parcelas.fatura_educbank_id` | Yes | Yes | `charge_installments.source_educbank_invoice_id` | preserve raw-only | optional | integration field | Low | High | No | Integration internals |
| `FaturaEducbankCodigo` | `blank` | `33369` | - | integration field | `sponte_raw_contas_receber_parcelas.fatura_educbank_codigo` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `FaturaIntegracaoID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.fatura_integracao_id` | Yes | Yes | `charge_installments.source_integration_invoice_id` | preserve raw-only | optional | integration field | Low | High | No | Integration internals |
| `SituacaoIntegracao` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber_parcelas.situacao_integracao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataGeracaoIntegracao` | `blank` | `33369` | - | date/time candidate | `sponte_raw_contas_receber_parcelas.data_geracao_integracao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LinkFaturaIntegracao` | `blank` | `33369` | - | text / code | `sponte_raw_contas_receber_parcelas.link_fatura_integracao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataVencimentoIntegracao` | `blank` | `33369` | - | date/time candidate | `sponte_raw_contas_receber_parcelas.data_vencimento_integracao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `LinhaDigitavelBoletoCNAB` | `boolean-ish` | `0` | `0` | boolean candidate | `sponte_raw_contas_receber_parcelas.linha_digitavel_boleto_cnab` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataCancelamento` | `date-ish string` | `30755` | `10/11/2024 4:16:42 PM`, `10/11/2024 4:16:43 PM`, `10/11/2024 4:17:13 PM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_cancelamento` | Yes | Yes | `charge_installments.cancelled_at` | normalize Excel datetime to timestamp/date | optional | finance timeline | Medium | Medium | No | Use carefully with status semantics |
| `DataInclusao` | `date-ish string` | `12480` | `8/13/2024 2:13:19 PM`, `8/13/2024 2:12:05 PM`, `8/19/2024 9:45:16 PM` | date/time candidate | `sponte_raw_contas_receber_parcelas.data_inclusao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsuarioID` | `boolean-ish` | `0` | `0`, `16`, `6` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.usuario_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `ID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `CreditoSpontePayAgrupadorID` | `boolean-ish` | `0` | `0`, `1`, `8` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.credito_sponte_pay_agrupador_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `SituacaoCreditoSpontePay` | `boolean-ish` | `0` | `0`, `4`, `2` | integration field | `sponte_raw_contas_receber_parcelas.situacao_credito_sponte_pay` | Yes | Yes | `charge_installments.source_credit_spontepay_status_code` | preserve raw-only | optional | integration field | Low | High | No | Integration internals |
| `DataGeracaoCreditoSpontePay` | `date-ish string` | `33365` | `10/22/2025 4:25:11 PM`, `3/11/2026 3:29:17 PM`, `12/17/2025 9:19:51 AM` | integration field | `sponte_raw_contas_receber_parcelas.data_geracao_credito_sponte_pay` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |
| `CobrancaSpontePay2ID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_contas_receber_parcelas.cobranca_sponte_pay2_id` | Yes | Yes | Raw only | - | - | - | - | High | No | Integration/provider field; preserve raw-only by default |

## RPS.xlsx

- Sheet: `RPS`
- Rows: `15341`
- Raw table: `sponte_raw_rps`
- Primary key: `RPSID`
- Purpose: Invoices / NFSe headers

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `RPSID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_rps.rpsid` | Yes | Yes | `invoices.source_invoice_id` | preserve source id | required | primary source key | High | Low | No | Primary invoice key |
| `NumeroRPS` | `integer-ish` | `0` | `1`, `2`, `3` | text / code | `sponte_raw_rps.numero_rps` | Yes | Yes | `invoices.rps_number` | trim text preserve leading zeros | required | invoice identity | High | Low | Yes | Searchable invoice field |
| `DataEmissao` | `date-ish string` | `0` | `2/26/2024 12:00:00 AM`, `5/3/2024 12:00:00 AM`, `5/10/2024 12:00:00 AM` | date/time candidate | `sponte_raw_rps.data_emissao` | Yes | Yes | `invoices.issued_at` | normalize Excel datetime to date/timestamp | required | invoice timeline | High | Low | No | Core invoice field |
| `Situacao` | `blank` | `15341` | - | text / code | `sponte_raw_rps.situacao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ISSRetido` | `integer-ish` | `0` | `2` | text / code | `sponte_raw_rps.iss_retido` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DiscriminacaoServicos` | `string` | `0` | `Mensalidade 1 de 3`, `Mensalidade 1 de 2`, `Mensalidade 3 de 11 - Aluno(a): (Caio Co` | text / code | `sponte_raw_rps.discriminacao_servicos` | Yes | Yes | `invoices.description` | trim text | optional | invoice context | Medium | Low | No | Human-readable service label |
| `NumeroNF` | `integer-ish` | `0` | `202400000000001`, `202400000000002`, `202400000000008` | text / code | `sponte_raw_rps.numero_nf` | Yes | Yes | `invoices.invoice_number` | trim text preserve leading zeros | optional | invoice identity | High | Low | Yes | Searchable invoice field |
| `ProtocoloRecebimento` | `boolean-ish` | `13290` | `0` | boolean candidate | `sponte_raw_rps.protocolo_recebimento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `SituacaoNF` | `integer-ish` | `0` | `100`, `101`, `999` | text / code | `sponte_raw_rps.situacao_nf` | Yes | Yes | `invoices.source_nf_status_code` | preserve source code | optional | invoice status | Low | Medium | No | Needs Review |
| `MotivoCancelamento` | `string` | `0` | `Efetivado`, `Baixa Manual: Dados corrigidos no cadast`, `Cancelado - [#inv0100] -  NFS-e cancelad` | text / code | `sponte_raw_rps.motivo_cancelamento` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ChaveNFSe` | `blank` | `15341` | - | text / code | `sponte_raw_rps.chave_nf_se` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `Status` | `integer-ish` | `0` | `100`, `101`, `999` | text / code | `sponte_raw_rps.status` | Yes | Yes | `invoices.status_code` | preserve source code | optional | invoice status | Medium | Medium | Yes | Needs Review |
| `TipoImpressao` | `blank` | `15341` | - | text / code | `sponte_raw_rps.tipo_impressao` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `ProtocoloEnvio` | `boolean-ish` | `13290` | `0` | boolean candidate | `sponte_raw_rps.protocolo_envio` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `UsuarioID` | `boolean-ish` | `0` | `0`, `16`, `-2` | ID / FK candidate | `sponte_raw_rps.usuario_id` | Yes | Yes | `invoices.source_user_id` | preserve source FK | optional | audit trace | Low | Medium | No | Raw useful for traceability only |
| `DocPDFLinkRPS` | `string` | `1` | `https://app.invoicy.com.br/DownloadPDF.a`, `https://app.invoicy.com.br/DownloadPDF.a`, `https://app.invoicy.com.br/DownloadPDF.a` | text / code | `sponte_raw_rps.doc_pdf_link_rps` | Yes | Yes | `invoices.pdf_url` | trim text keep external URL | optional | invoice artifact | High | Medium | No | External dependency; verify retention |
| `DataAutorizacao` | `date-ish string` | `653` | `2/26/2024 12:00:00 AM`, `5/3/2024 12:00:00 AM`, `5/10/2024 12:00:00 AM` | date/time candidate | `sponte_raw_rps.data_autorizacao` | Yes | Yes | `invoices.authorized_at` | normalize Excel datetime to date/timestamp | optional | invoice timeline | High | Low | No | Core invoice field |
| `ValorRPS` | `decimal` | `0` | `15.0000`, `1098.0000`, `1705.0000` | money candidate | `sponte_raw_rps.valor_rps` | Yes | Yes | `invoices.amount` | cast decimal money | required | invoice amount | High | Low | No | Core invoice field |
| `PrestadorID` | `boolean-ish` | `0` | `1` | ID / FK candidate | `sponte_raw_rps.prestador_id` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `DataCompetencia` | `date-ish string` | `0` | `2/26/2024 12:00:00 AM`, `5/3/2024 12:00:00 AM`, `5/10/2024 12:00:00 AM` | date/time candidate | `sponte_raw_rps.data_competencia` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |
| `AlteracaoManual` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_rps.alteracao_manual` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Needs Review |

## RPSParcelas.xlsx

- Sheet: `RPSParcelas`
- Rows: `15341`
- Raw table: `sponte_raw_rps_parcelas`
- Primary key: `RPSID+ContaReceberID+NumeroParcela`
- Purpose: Invoice to installment bridge

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `RPSID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_rps_parcelas.rpsid` | Yes | Yes | `invoice_installments.invoice_id` | join to invoices.source_invoice_id | required | FK invoices.source_invoice_id | High | Low | No | Invoice bridge |
| `ContaReceberID` | `integer-ish` | `0` | `2436`, `2438`, `2079` | ID / FK candidate | `sponte_raw_rps_parcelas.conta_receber_id` | Yes | Yes | `invoice_installments.charge_id` | join to charges.source_charge_id | required | FK charges.source_charge_id | High | Low | No | Charge bridge |
| `NumeroParcela` | `integer-ish` | `0` | `1`, `3`, `4` | text / code | `sponte_raw_rps_parcelas.numero_parcela` | Yes | Yes | `invoice_installments.installment_number` | cast integer if valid | required | installment bridge | High | Low | No | Installment bridge |

## DocumentosPendentes.xlsx

- Sheet: `DocumentosPendentes`
- Rows: `460`
- Raw table: `sponte_raw_documentos_pendentes`
- Primary key: `DocumentoPendenteID`
- Purpose: Pending student document headers

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DocumentoPendenteID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_documentos_pendentes.documento_pendente_id` | Yes | Yes | `pending_documents.source_pending_document_id` | preserve source id | required | primary source key | High | Low | No | Primary pending doc key |
| `AlunoId` | `integer-ish` | `0` | `211`, `10`, `161` | ID / FK candidate | `sponte_raw_documentos_pendentes.aluno_id` | Yes | Yes | `pending_documents.student_id` | join to students.source_student_id | required | FK students.source_student_id | High | Low | No | Pending doc student link |
| `FuncionarioID` | `boolean-ish` | `0` | `0` | ID / FK candidate | `sponte_raw_documentos_pendentes.funcionario_id` | Yes | Yes | `pending_documents.assigned_employee_id` | preserve source FK | optional | employee association | Low | Medium | No | Needs Review |
| `Observacoes` | `string` | `0` | `Documentos criados automaticamente atrav` | text / code | `sponte_raw_documentos_pendentes.observacoes` | Yes | Yes | `pending_documents.note` | trim text | optional | document note | High | Low | No | Document workflow context |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_documentos_pendentes.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `RecordValue` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_documentos_pendentes.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |

## DocumentosPendentesDetalhes.xlsx

- Sheet: `DocumentosPendentesDetalhes`
- Rows: `461`
- Raw table: `sponte_raw_documentos_pendentes_detalhes`
- Primary key: `DocumentoPendenteDetalheID`
- Purpose: Pending document detail/status records

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DocumentoPendenteDetalheID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_documentos_pendentes_detalhes.documento_pendente_detalhe_id` | Yes | Yes | `student_documents.source_pending_document_detail_id` | preserve source id | required | primary source key | High | Low | No | Primary detail key |
| `DocumentoPendenteID` | `integer-ish` | `0` | `2`, `3`, `4` | ID / FK candidate | `sponte_raw_documentos_pendentes_detalhes.documento_pendente_id` | Yes | Yes | `student_documents.pending_document_id` | join to pending_documents.source_pending_document_id | required | FK pending_documents.source_pending_document_id | High | Low | No | Pending doc header link |
| `TipoDocumentoPendenteID` | `boolean-ish` | `0` | `1`, `2` | ID / enum candidate | `sponte_raw_documentos_pendentes_detalhes.tipo_documento_pendente_id` | Yes | Yes | `student_documents.document_type` | decode via TiposDocumentosPendentes and store code + label | required | lookup TiposDocumentosPendentes.xlsx | High | Low | Yes | Document type label |
| `DataCadastro` | `date-ish string` | `0` | `9/3/2024 10:16:26 AM`, `9/9/2024 6:18:52 PM`, `9/9/2024 7:38:09 PM` | date/time candidate | `sponte_raw_documentos_pendentes_detalhes.data_cadastro` | Yes | Yes | `student_documents.created_at` | normalize Excel datetime to timestamp/date | optional | document timeline | High | Low | No | Source creation date |
| `DataLimite` | `date-ish string` | `0` | `10/3/2024 12:00:00 AM`, `10/9/2024 6:18:52 PM`, `10/9/2024 7:38:09 PM` | date/time candidate | `sponte_raw_documentos_pendentes_detalhes.data_limite` | Yes | Yes | `student_documents.due_date` | normalize Excel datetime to date | optional | document timeline | High | Low | No | Operational due date |
| `DataEntregue` | `boolean-ish` | `0` | `9/9/2024 12:00:00 AM`, `9/9/2024 6:18:52 PM`, `9/9/2024 7:38:10 PM` | boolean candidate | `sponte_raw_documentos_pendentes_detalhes.data_entregue` | Yes | Yes | `student_documents.delivered_at` | normalize Excel datetime to timestamp/date | optional | document timeline | High | Low | No | Operational completion date |
| `Entregue` | `boolean-ish` | `0` | `1`, `0` | boolean candidate | `sponte_raw_documentos_pendentes_detalhes.entregue` | Yes | Yes | `student_documents.delivered` | cast 0/1 to boolean | required | document status | High | Low | Yes | Core document status |
| `AvisoEnviado` | `boolean-ish` | `0` | `0`, `1` | boolean candidate | `sponte_raw_documentos_pendentes_detalhes.aviso_enviado` | Yes | Yes | `student_documents.notice_sent` | cast 0/1 to boolean | optional | document workflow | Medium | Low | No | Operational workflow flag |
| `RecordValue` | `integer-ish` | `0` | `2`, `1`, `3` | text / code | `sponte_raw_documentos_pendentes_detalhes.record_value` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |

## Anexos.xlsx

- Sheet: `Anexos`
- Rows: `251`
- Raw table: `sponte_raw_anexos`
- Primary key: `AnexoID`
- Purpose: Attachment metadata only

| Source column | Detected type | Blank count | Sample values | Semantic kind | Raw table.column | Preserve exact | raw_payload JSONB | Normalized mapping | Transform | Req | Relationship/key | Confidence | Risk | Search | Notes |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `AnexoID` | `integer-ish` | `0` | `1`, `2`, `3` | ID / FK candidate | `sponte_raw_anexos.anexo_id` | Yes | Yes | `student_documents.source_attachment_id` | preserve source id | required | primary source key | High | Low | No | Primary attachment metadata key |
| `ce` | `boolean-ish` | `0` | `1` | boolean candidate | `sponte_raw_anexos.ce` | Yes | Yes | Raw only | - | - | - | - | Medium | No | Technical/source tracking field; normalize only when explicitly useful |
| `Campo` | `string` | `0` | `TurmaMuralID`, `ALUNOID`, `AlunoID` | text / code | `sponte_raw_anexos.campo` | Yes | Yes | `student_documents.owner_type` | normalize to uppercase and map known owners | required | attachment owner discriminator | Medium | Medium | No | Mixed-owner attachment metadata |
| `Valor` | `decimal` | `0` | `2`, `10`, `161` | money candidate | `sponte_raw_anexos.valor` | Yes | Yes | `student_documents.owner_source_id` | preserve raw owner id text | required | attachment owner id | Medium | Medium | No | Needs owner-type aware joins |
| `Arquivo` | `date-ish string` | `0` | `logo.png`, `demonstrativo.pdf`, `comprovanteresidencia.pdf` | date/time candidate | `sponte_raw_anexos.arquivo` | Yes | Yes | `student_documents.file_name` | trim text | optional | document identity | High | Low | Yes | Displayable attachment name |
| `Descricao` | `blank` | `251` | - | text / code | `sponte_raw_anexos.descricao` | Yes | Yes | `student_documents.description` | trim text | optional | document note | Medium | Low | Yes | Free-text context |
| `DataEnvio` | `date-ish string` | `0` | `5/22/2024 9:20:47 AM`, `9/9/2024 6:18:52 PM`, `9/9/2024 7:38:09 PM` | date/time candidate | `sponte_raw_anexos.data_envio` | Yes | Yes | `student_documents.uploaded_at` | normalize Excel datetime to timestamp | optional | document timeline | High | Low | No | Attachment upload timestamp |
| `Tamanho` | `integer-ish` | `0` | `49454`, `74460`, `105044` | text / code | `sponte_raw_anexos.tamanho` | Yes | Yes | `student_documents.file_size_bytes` | cast integer if valid | optional | file metadata | High | Low | No | Attachment metadata only |
| `TipoDocumentoID` | `integer-ish` | `0` | `-1`, `0` | ID / enum candidate | `sponte_raw_anexos.tipo_documento_id` | Yes | Yes | `student_documents.source_document_type_id` | preserve source lookup id | optional | document type hint | Low | Medium | No | Needs Review; no lookup reviewed yet |
