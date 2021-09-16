import 'reflect-metadata';
import {
  Get,
  JsonController,
  Param,
  QueryParams,
  UseBefore,
} from 'routing-controllers';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Domain } from '../models';
import { In } from 'typeorm';
import { ApiKeyAuthMiddleware } from '../middleware/ApiKeyAuthMiddleware';
import { Blockchain } from '../utils/constants';
import { Location } from '../models/Domain';

class DomainMetadata {
  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  owner: string | null = null;

  @IsOptional()
  @IsString()
  resolver: string | null = null;

  @IsOptional()
  @IsString()
  blockchain: keyof typeof Blockchain | null = null;

  @IsOptional()
  @IsNumber()
  networkId: number | null = null;

  @IsOptional()
  @IsString()
  registry: string | null = null;
}

class DomainResponse {
  @ValidateNested()
  meta: DomainMetadata;

  @IsObject()
  records: Record<string, string> = {};
}

class DomainsListQuery {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  owners: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  networkIds: number[];

  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  blockchains: string[];

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  page = 1;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(200)
  perPage = 100;
}

class DomainAttributes {
  @IsString()
  id: string;

  @ValidateNested()
  attributes: DomainResponse;
}

class DomainsListResponse {
  data: DomainAttributes[];
}

@OpenAPI({
  security: [{ apiKeyAuth: [] }],
})
@JsonController()
@UseBefore(ApiKeyAuthMiddleware)
export class DomainsController {
  @Get('/domains/:domainName')
  @ResponseSchema(DomainResponse)
  async getDomain(
    @Param('domainName') domainName: string,
  ): Promise<DomainResponse> {
    domainName = domainName.toLowerCase();
    const domain = await Domain.findOne({ name: domainName });
    if (domain) {
      const response = new DomainResponse();
      response.meta = {
        domain: domainName,
        owner: domain.ownerAddress,
        resolver: domain.resolver,
        registry: domain.registry,
        blockchain: domain.blockchain,
        networkId: domain.networkId,
      };
      response.records = domain.resolution;
      return response;
    }
    return {
      meta: {
        domain: domainName,
        owner: null,
        resolver: null,
        registry: null,
        blockchain: null,
        networkId: null,
      },
      records: {},
    };
  }

  @Get('/domains')
  @OpenAPI({
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/DomainAttributes',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getDomainsList(
    @QueryParams() query: DomainsListQuery,
  ): Promise<DomainsListResponse> {
    const ownersQuery = query.owners.map((owner) => owner.toLowerCase());
    const domains = await Domain.find({
      where: {
        ownerAddress: ownersQuery ? In(ownersQuery) : undefined,
        blockchain: In(query.blockchains),
        networkId: In(query.networkIds),
      },
      take: query.perPage,
      skip: (query.page - 1) * query.perPage,
    });
    const response = new DomainsListResponse();
    response.data = [];
    for (const domain of domains) {
      response.data.push({
        id: domain.name,
        attributes: {
          meta: {
            blockchain: domain.blockchain,
            networkId: domain.networkId,
            owner: domain.ownerAddress,
            resolver: domain.resolver,
            registry: domain.registry,
            domain: domain.name,
          },
          records: domain.resolution,
        },
      });
    }
    return response;
  }
}
