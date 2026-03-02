import { PrismaClient } from "@prisma/client";
import { IdentifyRequest, ContactResponse, ContactRecord } from "../types";

const prisma = new PrismaClient();

export async function identifyContact(
  request: IdentifyRequest
): Promise<ContactResponse> {
  const { email, phoneNumber } = request;

  const matchingContacts: ContactRecord[] = (await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    },
  })) as ContactRecord[];

  if (matchingContacts.length === 0) {
    const newContact = (await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        linkPrecedence: "primary",
        linkedId: null,
      },
    })) as ContactRecord;

    return buildResponse(newContact, []);
  }

  const allClusterContacts: ContactRecord[] =
    await getAllClusterContacts(matchingContacts);

  const primaryContacts: ContactRecord[] = allClusterContacts.filter(
    (c: ContactRecord) => c.linkPrecedence === "primary"
  );

  primaryContacts.sort(
    (a: ContactRecord, b: ContactRecord) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const truePrimary: ContactRecord = primaryContacts[0];
  const primaryContactsToDowngrade: ContactRecord[] = primaryContacts.slice(1);

  if (primaryContactsToDowngrade.length > 0) {
    for (const pc of primaryContactsToDowngrade) {
      await prisma.contact.update({
        where: { id: pc.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: truePrimary.id,
          updatedAt: new Date(),
        },
      });

      await prisma.contact.updateMany({
        where: {
          linkedId: pc.id,
          deletedAt: null,
        },
        data: {
          linkedId: truePrimary.id,
          updatedAt: new Date(),
        },
      });
    }
  }

  const updatedClusterContacts: ContactRecord[] =
    (await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
      },
    })) as ContactRecord[];

  const allEmails = new Set<string>(
    updatedClusterContacts
      .map((c: ContactRecord) => c.email)
      .filter((e): e is string => e !== null)
  );
  const allPhones = new Set<string>(
    updatedClusterContacts
      .map((c: ContactRecord) => c.phoneNumber)
      .filter((p): p is string => p !== null)
  );

  const hasNewEmail = email && !allEmails.has(email);
  const hasNewPhone = phoneNumber && !allPhones.has(phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        linkedId: truePrimary.id,
        linkPrecedence: "secondary",
      },
    });
  }

  const finalClusterContacts: ContactRecord[] =
    (await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
      },
      orderBy: { createdAt: "asc" },
    })) as ContactRecord[];

  const secondaryContacts: ContactRecord[] = finalClusterContacts.filter(
    (c: ContactRecord) => c.id !== truePrimary.id
  );

  return buildResponse(truePrimary, secondaryContacts);
}

async function getAllClusterContacts(
  matchingContacts: ContactRecord[]
): Promise<ContactRecord[]> {
  const primaryIds = new Set<number>();

  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === "primary") {
      primaryIds.add(contact.id);
    } else if (contact.linkedId !== null) {
      primaryIds.add(contact.linkedId);
    }
  }

  const allContacts: ContactRecord[] = [];
  const seenIds = new Set<number>();

  for (const primaryId of primaryIds) {
    const clusterContacts: ContactRecord[] =
      (await prisma.contact.findMany({
        where: {
          deletedAt: null,
          OR: [{ id: primaryId }, { linkedId: primaryId }],
        },
      })) as ContactRecord[];

    for (const c of clusterContacts) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        allContacts.push(c);
      }
    }
  }

  return allContacts;
}

function buildResponse(
  primary: ContactRecord,
  secondaryContacts: ContactRecord[]
): ContactResponse {
  const emails: string[] = [];
  if (primary.email) emails.push(primary.email);
  for (const c of secondaryContacts) {
    if (c.email && !emails.includes(c.email)) {
      emails.push(c.email);
    }
  }

  const phoneNumbers: string[] = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const c of secondaryContacts) {
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
      phoneNumbers.push(c.phoneNumber);
    }
  }

  return {
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryContacts.map((c: ContactRecord) => c.id),
    },
  };
}
