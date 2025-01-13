import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// IMPORTANT: Replace these IDs with actual Clerk user IDs after creating the users in Clerk dashboard
const users = [
  {
    id: 'user_2rH1cNVtDrXlZVYZC1IHaHw04ta',
    email: 'ttttsmurf1@gmail.com',
    name: 'Henry Fineman',
    image: 'https://res.cloudinary.com/ddwtgquw8/image/upload/v1736804419/user-pic-1_prmnrl.jpg',
    role: 'Personal Trainer',
    personality: 'Passionate and encouraging about fitness, uses scientific facts to back claims'
  },
  {
    id: 'user_2rHFrAEkcsnq6Jb6wB1LR7ecJnZ',
    email: 'ttttsmurf2@gmail.com',
    name: 'Jessica James',
    image: 'https://res.cloudinary.com/ddwtgquw8/image/upload/v1736804419/teacher_ai_ll1h7r.jpg',
    role: 'School Teacher',
    personality: 'Practical and balanced view on exercise, concerned about work-life balance'
  },
  {
    id: 'user_2rJC0ugefaYoZwxxETircVzmKtE',
    email: 'ttttsmurf3@gmail.com',
    name: 'Larry Loin',
    image: 'https://res.cloudinary.com/ddwtgquw8/image/upload/v1736804419/lazy_guy_ai_rzod8w.jpg',
    role: 'Couch Potato',
    personality: 'Skeptical about exercise benefits, makes excuses, but occasionally shows interest'
  },
  {
    id: 'user_2rS1fPQHMRp4IXwswzbSATmfYn0',
    email: 'ttttsmurf4@gmail.com',
    name: 'Aaron Ghust',
    image: 'https://res.cloudinary.com/ddwtgquw8/image/upload/v1736804419/lifter_ai_dlej8v.jpg',
    role: 'Olympic Lifter',
    personality: 'Intense about training, sometimes critical of casual approaches'
  }
]

// Helper function to generate timestamps
function getRandomTimestamp(startDate: Date, endDate: Date) {
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
}

async function main() {
  try {
    console.log('Starting database seed...')

    // Clean existing data
    console.log('Cleaning up existing data...')
    await prisma.reaction.deleteMany()
    await prisma.message.deleteMany()
    await prisma.directMessage.deleteMany()
    await prisma.thread.deleteMany()
    await prisma.channel.deleteMany()
    await prisma.workspaceMember.deleteMany()
    await prisma.workspace.deleteMany()
    await prisma.user.deleteMany()

    // Create users in the User table (simulating Clerk users)
    console.log('Creating users...')
    for (const user of users) {
      await prisma.user.create({
        data: {
          userId: user.id,
          status: 'ONLINE'
        }
      })
    }

    // Create workspace
    console.log('Creating new workspace...')
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Default Workspace',
        inviteCode: uuidv4(),
        imageUrl: 'https://utfs.io/f/c4919193-ea4c-4e51-9af3-f5eae2e2c565-1sqqor.svg',
        channels: {
          create: [
            {
              name: 'general',
              description: 'General discussion channel'
            },
            {
              name: 'random',
              description: 'Random discussions'
            }
          ]
        }
      },
      include: {
        channels: true
      }
    })

    // Verify the workspace was created
    const createdWorkspace = await prisma.workspace.findFirst({
      where: {
        name: 'Default Workspace'
      }
    })
    
    console.log('Created workspace:', createdWorkspace)

    // Add members to workspace with their profile images
    console.log('Adding members to workspace...')
    
    // First, store the images in FileUpload table
    const fileUploads = await Promise.all(users.map(async user => {
      // Create a file upload entry for each user's image
      const fileUpload = await prisma.fileUpload.create({
        data: {
          fileName: `${user.name.toLowerCase().replace(/\s+/g, '-')}-profile.jpg`,
          fileType: 'image/jpeg',
          data: user.image, // Store the direct Cloudinary URL
        }
      });
      return {
        userId: user.id,
        fileId: fileUpload.id,
        imageUrl: `/api/files/${fileUpload.id}`
      };
    }));

    // Create a map for easy lookup of file URLs
    const userImageMap = new Map(fileUploads.map(upload => [upload.userId, upload.imageUrl]));

    // Now create workspace members with the file URLs
    const workspaceMembers = await Promise.all(users.map(user => 
      prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          userName: user.name,
          userImage: userImageMap.get(user.id),
          role: 'MEMBER',
          status: 'ONLINE',
          isFirstLogin: false,
          hasCustomName: true,
          hasCustomImage: true
        }
      })
    ));

    // Create a map of user profiles for easy lookup
    const userProfiles = new Map(workspaceMembers.map(member => [
      member.userId,
      {
        userName: member.userName,
        userImage: member.userImage
      }
    ]));

    const generalChannel = workspace.channels[0]
    const startDate = new Date('2024-03-20T09:00:00Z')
    const endDate = new Date('2024-03-20T11:00:00Z')

    // Generate conversation messages
    console.log('Generating conversation...')
    const conversationMessages = [
      // Initial message
      {
        userId: users[0].id,
        content: "Hey everyone! As a personal trainer, I've seen incredible transformations through regular exercise. Anyone here want to share their fitness journey?"
      },
      {
        userId: users[2].id,
        content: "Ugh, not this again. I'm perfectly happy with my lifestyle. Why does everyone push exercise so much? *munches chips*"
      },
      {
        userId: users[1].id,
        content: "I try to stay active between classes, but it's hard to find the time. Though I do notice I have more energy when I exercise regularly."
      },
      {
        userId: users[3].id,
        content: "NOTHING beats the feeling of hitting a new PR! Just crushed a 180kg clean and jerk today! 💪"
      }
    ]

    // // Add more conversation messages
    // for (let i = 0; i < 49; i++) {
    //   // Henry (Personal Trainer) messages
    //   conversationMessages.push({
    //     userId: users[0].id,
    //     content: [
    //       "Studies show that regular exercise reduces the risk of chronic diseases by up to 50%!",
    //       "Even 30 minutes of walking daily can make a huge difference.",
    //       "*checking my client's progress* Just had someone lose 20 pounds in 2 months through consistent training!",
    //       "The mental health benefits of exercise are just as important as the physical ones.",
    //       "Remember, it's not about being perfect, it's about being consistent!"
    //     ][Math.floor(Math.random() * 5)]
    //   })

    //   // Jessica (Teacher) messages
    //   conversationMessages.push({
    //     userId: users[1].id,
    //     content: [
    //       "*grading papers between sets* I've started doing quick workouts during my lunch break.",
    //       "My students are definitely more attentive when we do active learning exercises.",
    //       "I understand both sides - we need balance in life.",
    //       "*stretching after sitting too long* My back feels so much better when I stay active.",
    //       "Just got back from a walking meeting with another teacher - multitasking!"
    //     ][Math.floor(Math.random() * 5)]
    //   })

    //   // Larry (Couch Potato) messages
    //   conversationMessages.push({
    //     userId: users[2].id,
    //     content: [
    //       "*watching TV* But my favorite shows are on during gym time!",
    //       "Exercise is too expensive. Netflix is cheaper than a gym membership!",
    //       "*yawning* Maybe I'll start next week... or next month...",
    //       "Fine, I did take the stairs today instead of the elevator... happy now?",
    //       "*ordering takeout* But healthy food doesn't taste as good!"
    //     ][Math.floor(Math.random() * 5)]
    //   })

    //   // Aaron (Olympic Lifter) messages
    //   conversationMessages.push({
    //     userId: users[3].id,
    //     content: [
    //       "NO EXCUSES! If I can train 6 hours a day, you can do 30 minutes!",
    //       "*chalk dust everywhere* Just finished my third session of the day!",
    //       "The Olympic village is calling my name! Paris 2024! 🏋️‍♂️",
    //       "You think that's heavy? Try snatching 140kg!",
    //       "*meal prepping* Protein is life! What's your macro split?"
    //     ][Math.floor(Math.random() * 5)]
    //   })
    // }

    // // Shuffle messages to make conversation more natural
    // conversationMessages.sort(() => Math.random() - 0.5)

    // // Prevent consecutive messages from the same user
    // for (let i = 1; i < conversationMessages.length; i++) {
    //   if (conversationMessages[i].userId === conversationMessages[i - 1].userId) {
    //     for (let j = i + 1; j < conversationMessages.length; j++) {
    //       if (conversationMessages[j].userId !== conversationMessages[i - 1].userId) {
    //         const temp = conversationMessages[i];
    //         conversationMessages[i] = conversationMessages[j];
    //         conversationMessages[j] = temp;
    //         break;
    //       }
    //     }
    //   }
    // }

    // Create messages with progressive timestamps
    console.log('Creating messages...')
    
    // Sort messages by timestamp to maintain chronological order
    const sortedMessages = conversationMessages.map((message, index) => ({
      ...message,
      timestamp: getRandomTimestamp(startDate, endDate)
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Create all messages with consistent profile pictures
    for (const message of sortedMessages) {
      const userProfile = userProfiles.get(message.userId);
      if (!userProfile) {
        throw new Error(`User profile not found for user ${message.userId}`);
      }

      await prisma.message.create({
        data: {
          content: message.content,
          userId: message.userId,
          userName: userProfile.userName,
          userImage: userProfile.userImage,
          channelId: generalChannel.id,
          workspaceId: workspace.id,
          createdAt: message.timestamp,
          updatedAt: message.timestamp
        }
      });
    }

    console.log('Seed completed successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })