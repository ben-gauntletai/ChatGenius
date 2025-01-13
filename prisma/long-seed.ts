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
        userId: users[1].id,
        content: "I try to stay active between classes, but it's hard to find the time. Though I do notice I have more energy when I exercise regularly."
      },
      {
        userId: users[2].id,
        content: "Ugh, not this again. I'm perfectly happy with my lifestyle. Why does everyone push exercise so much? *munches chips*"
      },
      {
        userId: users[3].id,
        content: "NOTHING beats the feeling of hitting a new PR! Just crushed a 180kg clean and jerk today! 💪"
      }
    ]

    // Define messages for each user
    const messages = {
      henry: [
        "Studies show that regular exercise reduces the risk of chronic diseases by up to 50%!",
        "Even 30 minutes of walking daily can make a huge difference.",
        "*checking my client's progress* Just had someone lose 20 pounds in 2 months through consistent training!",
        "The mental health benefits of exercise are just as important as the physical ones.",
        "Remember, it's not about being perfect, it's about being consistent!",
        "*demonstrating proper form* Keep your core tight and back straight!",
        "Just finished a great group session - the energy was incredible! 🔥",
        "According to research, exercise can improve memory and cognitive function.",
        "*sharing before/after photos* These results speak for themselves!",
        "Proper nutrition and exercise go hand in hand for optimal health.",
        "It's amazing how exercise can boost your immune system naturally.",
        "*setting up equipment* Let's focus on functional movements today.",
        "Exercise doesn't have to be intense to be effective - consistency is key!",
        "Just helped a 65-year-old client deadlift their bodyweight! Age is just a number!",
        "Remember to stay hydrated during your workouts! 💧"
      ],
      jessica: [
        "*grading papers between sets* I've started doing quick workouts during my lunch break.",
        "My students are definitely more attentive when we do active learning exercises.",
        "I understand both sides - we need balance in life.",
        "*stretching after sitting too long* My back feels so much better when I stay active.",
        "Just got back from a walking meeting with another teacher - multitasking!",
        "*organizing PE class* The kids love these new active learning games!",
        "Started a morning yoga routine before class - makes such a difference.",
        "Found some great desk exercises to share with other teachers.",
        "*planning field day* Exercise can be fun when you make it a game!",
        "Notice how my classroom management improved since adding movement breaks.",
        "Taking the stairs instead of the elevator - small changes add up!",
        "*doing jumping jacks* Quick energizer between lesson plans!",
        "The school started a teacher wellness program - really helping with stress.",
        "Incorporating movement into math lessons - the kids are loving it!",
        "Started a teacher walking club during lunch - great for body and mind!"
      ],
      larry: [
        "*watching TV* But my favorite shows are on during gym time!",
        "Exercise is too expensive. Netflix is cheaper than a gym membership!",
        "*yawning* Maybe I'll start next week... or next month...",
        "Fine, I did take the stairs today instead of the elevator... happy now?",
        "*ordering takeout* But healthy food doesn't taste as good!",
        "*scrolling through phone* These workout influencers make it look too easy.",
        "My couch has memory foam - that's basically exercise for it, right?",
        "*adjusting TV remote* The walk to the kitchen counts as cardio!",
        "Why exercise when there's a new season of my favorite show?",
        "My gaming sessions work out my thumb muscles! 🎮",
        "*checking delivery app* The delivery guy gets enough exercise for both of us.",
        "I did a push-up last year. Still recovering from that.",
        "My relationship with my couch is the only commitment I need.",
        "*finding TV remote* This counts as a treasure hunt workout!",
        "Exercise? In this economy? *orders another pizza*"
      ],
      aaron: [
        "NO EXCUSES! If I can train 6 hours a day, you can do 30 minutes!",
        "*chalk dust everywhere* Just finished my third session of the day!",
        "The Olympic village is calling my name! Paris 2024! 🏋️‍♂️",
        "You think that's heavy? Try snatching 140kg!",
        "*meal prepping* Protein is life! What's your macro split?",
        "*checking stopwatch* New personal record on clean and jerk! 💪",
        "Sleep, eat, lift, repeat - that's the champion's lifestyle!",
        "Just ordered my third pair of weightlifting shoes this month!",
        "*applying knee wraps* Time for some REAL training!",
        "If you're not failing lifts, you're not pushing hard enough!",
        "My rest days are basically active recovery with light 100kg squats.",
        "*mixing pre-workout* Let's make these weights fear us today!",
        "Just watched competition footage - my technique needs more power!",
        "Who needs a social life when you have barbells? 🏋️‍♂️",
        "*checking competition schedule* Every training day counts!"
      ]
    }

    // Create message indices to track which message to use next for each user
    let messageIndices = {
      henry: 0,
      jessica: 0,
      larry: 0,
      aaron: 0
    }

    // Add messages in a consistent order, using each message exactly once
    for (let i = 0; i < 15; i++) {
      // Each user speaks once in each round, using their next message
      conversationMessages.push({
        userId: users[0].id,
        content: messages.henry[messageIndices.henry++]
      })
      conversationMessages.push({
        userId: users[1].id,
        content: messages.jessica[messageIndices.jessica++]
      })
      conversationMessages.push({
        userId: users[2].id,
        content: messages.larry[messageIndices.larry++]
      })
      conversationMessages.push({
        userId: users[3].id,
        content: messages.aaron[messageIndices.aaron++]
      })
    }

    // Create messages with progressive timestamps
    console.log('Creating messages...')
    
    // Create timestamps that ensure messages appear in the exact order they were added
    const sortedMessages = conversationMessages.map((message, index) => ({
      ...message,
      timestamp: new Date(startDate.getTime() + (index * (endDate.getTime() - startDate.getTime()) / conversationMessages.length))
    }));

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